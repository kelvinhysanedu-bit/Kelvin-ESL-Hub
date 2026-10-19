// Firebase web-app settings. These values are not secret; the security rules in Firebase protect the data.
// Set this to null to run in demo mode (data stays in the browser).
export const firebaseConfig = {
  apiKey: "AIzaSyBci35UaHWyAjMTz-mQyTXRzJcEJjM4QXs",
  authDomain: "kelvin-esl-hub.firebaseapp.com",
  projectId: "kelvin-esl-hub",
  storageBucket: "kelvin-esl-hub.firebasestorage.app",
  messagingSenderId: "286317731753",
  appId: "1:286317731753:web:1d879aec9d4f160e2d2eb8",
};

// Temporary board for the writing challenge, shown below the reflection board. Set to null to remove it.
export const writingChallenge = {
  title: "Writing challenge",
  date: "2026-10-19",
  description: "A temporary board for our writing challenge. Add your writing and read what others have written.",
  embedUrl: "https://padlet.com/padlets/s024naww2cm5ux5u383v/embeds/preview_embed",
};

// Reflection board (a Padlet) shown on the student dashboard. Set to null to hide the section.
export const padletEmbedUrl = "https://padlet.com/padlets/s023lodi75uqr4ozu0sv/embeds/preview_embed";
