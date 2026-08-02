# HSE OPS AI — Voice Interaction Design

## Why Voice Is Critical

Field workers in oil & gas often cannot type:
- Wearing heavy gloves
- Holding equipment with both hands
- In noisy environments (drilling floor, compressor rooms)
- Working at height where looking at a screen is unsafe

Voice is the primary input method for the `field_worker` and `contractor` personas.

## Voice Architecture

### Primary: Web Speech API (Browser-Native)
- `SpeechRecognition` API — available in Chrome, Edge, Safari 15+
- No server round-trip for basic transcription
- Requires network connectivity (Chrome sends audio to Google servers)
- Good accuracy in quiet environments

### Fallback: OpenAI Whisper API
- Used when Web Speech API is unavailable or for noisy environments
- Audio recorded client-side (MediaRecorder API), sent to Supabase Edge Function
- The Edge Function calls Whisper with `noise_reduction: true`
- Higher accuracy in industrial noise environments
- ~2-3 second latency vs. ~1 second for Web Speech API

## Voice Input Flow (Chat Page)

```
User taps microphone button
    ↓
Request microphone permission (first time)
    ↓
SpeechRecognition.start() — visual waveform indicator shown
    ↓
interim results: show live transcript preview
    ↓
SpeechRecognition.onend (user stops speaking / silence detected)
    ↓
if (confidence > 0.7) → populate query input, auto-submit
if (confidence ≤ 0.7) → populate input field, user reviews + submits manually
    ↓
If Web Speech API not available:
    → MediaRecorder captures audio (max 30 seconds)
    → Upload to /functions/v1/transcribe-voice
    → Whisper returns transcript
    → Populate input field
```

## Voice Output (Text-to-Speech)

AI responses can be read aloud for eyes-free use:

```typescript
function speakResponse(text: string) {
  const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
  utterance.rate = 0.9;     // slightly slower for clarity
  utterance.pitch = 1.0;
  utterance.lang = 'en-NG'; // Nigerian English accent if available
  speechSynthesis.speak(utterance);
}
```

Strip markdown before speech synthesis (remove `**`, `##`, table syntax, etc.).

## UI States (Chat Page Voice Button)

```
Idle:       Mic icon (grey)         onClick: start recording
Recording:  Mic icon (red, pulsing)  onClick: stop recording
Processing: Loader icon (spinning)   — wait for transcript
Error:      Mic icon with X          show "Microphone unavailable"
```

## Noise Reduction (Whisper Fallback)

```typescript
// Edge Function: transcribe-voice/index.ts
const response = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en',
  prompt: 'This is a query about oil and gas safety procedures. HSE, PTW, JSA, SIMOPS, H2S, confined space, permit to work.',
  // Whisper prompt improves accuracy for domain-specific terminology
});
```

The prompt pre-loads Whisper with relevant domain vocabulary, significantly improving accuracy for HSE-specific terms.

## Key Domain Terms for Voice Recognition

These terms must be correctly recognised (common mis-transcriptions in parentheses):
- H₂S / H2S (→ "H two S", "hydrogen sulfide", "aitch two ess")
- PTW (→ "P T W", "permit to work")
- JSA (→ "J S A", "job safety analysis")
- SIMOPS (→ "sim ops", "simultaneous operations")
- LOTO (→ "L O T O", "lockout tagout")
- OIM (→ "O I M", "offshore installation manager")
- ESD (→ "E S D", "emergency shutdown")
- SWL (→ "S W L", "safe working load")
- CSE (→ "C S E", "confined space entry")

When using Web Speech API, post-process the transcript to normalize these terms.

## Voice Accessibility Notes

- Voice input is ADDITIVE — text input always remains available
- Voice button never auto-submits without user confirmation if confidence < 0.7
- Visual transcript preview lets user correct before submitting
- Screen reader compatible: voice button has `aria-label` and `aria-pressed` state
- Push-to-talk option (hold button) for noisy environments

## Phase 5 Deliverables

- [ ] Microphone button in ChatPage with recording state machine
- [ ] Web Speech API integration with fallback detection
- [ ] Whisper Edge Function (`supabase/functions/transcribe-voice/index.ts`)
- [ ] Voice output button on AI messages (speak response)
- [ ] Post-processing for domain term normalization
- [ ] Mobile-optimised large tap target for microphone button
