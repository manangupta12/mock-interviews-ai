export class TranscriptionService {
  private recognition: any;
  private isListening: boolean = false;
  private onTranscriptCallback: ((text: string) => void) | null = null;
  private accumulatedTranscript: string = ''; // Store all final transcripts

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';

        // Process all results from resultIndex (where new results start)
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            // Add final transcript to accumulated, avoiding duplicates
            const trimmedTranscript = transcript.trim();
            if (trimmedTranscript) {
              // Check if this transcript is already in our accumulated text
              // This handles cases where recognition restarts and might re-process results
              if (!this.accumulatedTranscript.includes(trimmedTranscript)) {
                this.accumulatedTranscript += transcript + ' ';
              }
            }
          } else {
            // This is interim (not final yet) - show current interim text
            interimTranscript += transcript;
          }
        }

        // Combine accumulated final transcript with current interim transcript
        const fullTranscript = (this.accumulatedTranscript + interimTranscript).trim();

        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(fullTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        // Don't interfere with normal pause handling
        // The onend handler will restart if needed
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Keep accumulated transcript - don't reset it
          // The recognition will restart and continue accumulating
          // Restart if still listening (handles pauses automatically)
          try {
            this.recognition.start();
          } catch (e) {
            // If already started, ignore the error (can happen during rapid state changes)
            if (e.name !== 'InvalidStateError') {
              console.error('Error restarting recognition:', e);
            }
          }
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  start(onTranscript: (text: string) => void) {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    // Reset accumulated transcript when starting a new recording session
    this.accumulatedTranscript = '';
    this.onTranscriptCallback = onTranscript;
    this.isListening = true;

    try {
      this.recognition.start();
    } catch (e) {
      // If already started, that's okay - it means it's continuing
      if (e.name !== 'InvalidStateError') {
        console.error('Error starting recognition:', e);
      }
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
    // Reset accumulated transcript when stopping
    this.accumulatedTranscript = '';
    this.onTranscriptCallback = null;
  }

  isSupported(): boolean {
    return !!this.recognition;
  }
}

