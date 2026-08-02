# HSE OPS AI — Docker & Kubernetes Strategy

## Current State

HSE OPS AI does not use Docker or Kubernetes in its current Supabase-hosted architecture. This document describes the containerisation strategy for Phase 6 when self-hosting on Azure becomes a requirement.

## When to Containerise

Containerisation becomes necessary when:
1. NEPL requires full data residency in Azure Africa (South Africa North) — Supabase does not offer this region
2. Platform scale requires dedicated infrastructure (> 1000 concurrent users)
3. Integration with NEPL's internal network requires VNet connectivity
4. Custom AI model fine-tuning requires co-located GPU resources

## Docker Services (Self-Hosted Stack)

```yaml
# docker-compose.yml (self-hosted reference)
services:
  frontend:
    build: .
    dockerfile: Dockerfile.frontend
    ports: ["80:80", "443:443"]
    environment:
      - VITE_SUPABASE_URL=http://supabase-kong:8000
      - VITE_SUPABASE_ANON_KEY=${ANON_KEY}

  supabase-db:
    image: supabase/postgres:15.1.0.147
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d

  supabase-kong:
    image: kong:2.8.1
    # API gateway

  supabase-auth:
    image: supabase/gotrue:v2.132.3

  supabase-rest:
    image: postgrest/postgrest:v12.0.2

  supabase-realtime:
    image: supabase/realtime:v2.28.32

  supabase-storage:
    image: supabase/storage-api:v0.46.4

  supabase-functions:
    image: supabase/edge-runtime:v1.45.2
    volumes:
      - ./supabase/functions:/home/deno/functions

  redis:
    image: redis:7-alpine
    # Rate limiting, session cache

volumes:
  db_data:
```

## Kubernetes Architecture (Azure AKS)

For production at scale on Azure Kubernetes Service:

```
Namespace: safeops-prod
├── Deployment: frontend (3 replicas, nginx)
├── Deployment: supabase-auth (2 replicas)
├── Deployment: supabase-rest (3 replicas)
├── Deployment: edge-runtime (3 replicas, auto-scale on CPU)
├── StatefulSet: postgresql (1 primary + 1 replica)
├── StatefulSet: redis (1 primary + 1 replica)
├── Service: LoadBalancer (Azure Application Gateway)
├── PersistentVolumeClaim: postgres-data (Azure Disk, Premium SSD)
└── PersistentVolumeClaim: storage-data (Azure Blob FUSE)
```

## Dockerfile (Frontend)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## nginx.conf (SPA Routing)

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # SPA: all non-asset routes → index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Security headers
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;
  add_header Content-Security-Policy "default-src 'self'; ...";
}
```

## Environment Management

| Environment | Config Source | Notes |
|-------------|--------------|-------|
| Development | `.env` file | Local Supabase or hosted project |
| Staging | Azure Key Vault | Connected via CSI driver |
| Production | Azure Key Vault | Secrets injected at pod startup |

## CI/CD Pipeline (GitHub Actions → AKS)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - npm run typecheck
      - npm run build
      - docker build -t safeops-frontend:$SHA .
      - docker push acr.azurecr.io/safeops-frontend:$SHA
      - kubectl set image deployment/frontend frontend=acr.azurecr.io/safeops-frontend:$SHA
      - kubectl rollout status deployment/frontend
```

Zero-downtime rolling deployment with health checks.

## Note on Current Phase

For Phase 1–5, use Supabase hosted infrastructure. Docker/Kubernetes is only required for Phase 6 self-hosted enterprise deployment.
