"use client";

import { useEffect, useRef, useState } from "react";

export function useTTS() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize voice list and check support
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setSupported(false);
      return;
    }

    setSupported(true);

    // Load voices
    const loadVoices = () => {
      const allVoices = synth.getVoices();
      // Prefer German voices first, then all others
      const germanVoices = allVoices.filter((v) => v.lang.startsWith("de"));
      const otherVoices = allVoices.filter((v) => !v.lang.startsWith("de"));
      setVoices([...germanVoices, ...otherVoices]);
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  function speak(text: string) {
    if (!supported) return;

    const ttsEnabled = localStorage.getItem("rv-tts-enabled") === "1";
    if (!ttsEnabled) return;

    const synth = window.speechSynthesis;
    synth.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";

    // Get voice preference
    const voiceURI = localStorage.getItem("rv-tts-voice");
    if (voiceURI) {
      const selectedVoice = voices.find((v) => v.voiceURI === voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Get rate preference
    const rateStr = localStorage.getItem("rv-tts-rate");
    if (rateStr) {
      const rate = parseFloat(rateStr);
      if (!isNaN(rate) && rate >= 0.5 && rate <= 2) {
        utterance.rate = rate;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  return {
    speak,
    stop,
    isSpeaking,
    voices,
    supported,
  };
}
