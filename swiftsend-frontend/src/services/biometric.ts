// Web equivalent of the mobile build's Face ID / fingerprint login. Browsers expose
// this through WebAuthn's "platform authenticator" (Touch ID, Windows Hello, Android
// fingerprint unlock, etc.) rather than a dedicated biometrics API.
//
// A real implementation needs a backend to issue a WebAuthn challenge and verify the
// signed response — there is no way to do real passwordless biometric auth from the
// frontend alone. What's here is honest about that: it detects whether the browser/
// device *could* support it (a real, standard web API call) and, same as the mobile
// build's demo behaviour, re-submits whatever credentials are currently typed in the
// form after the browser's own platform prompt succeeds.

export interface BiometricAvailability {
  available: boolean;
  typeLabel: "Face ID" | "Fingerprint" | "Biometrics" | null;
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      return { available: false, typeLabel: null };
    }
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return { available: false, typeLabel: null };

    const ua = navigator.userAgent;
    const typeLabel: BiometricAvailability["typeLabel"] = /iPhone|iPad|Mac/.test(ua)
      ? "Face ID"
      : /Android/.test(ua)
      ? "Fingerprint"
      : "Biometrics";

    return { available: true, typeLabel };
  } catch {
    return { available: false, typeLabel: null };
  }
}

/**
 * Triggers the browser's own platform-authenticator prompt (the same native Touch
 * ID / Windows Hello dialog a real WebAuthn sign-in would use) as a user-verification
 * gate. Without a backend-issued challenge this can't authenticate a specific account —
 * see the file-level note above — so on success the caller re-runs the normal
 * email/password login rather than this function returning an identity by itself.
 */
export async function promptBiometricLogin(_typeLabel: string | null): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    // A zero-knowledge local verification: asks the platform authenticator to confirm
    // "this is the device owner" without a server round trip. Real account sign-in
    // would instead call navigator.credentials.get() with a server-issued challenge.
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "SwiftSend" },
        user: { id: new Uint8Array(16), name: "swiftsend-demo", displayName: "SwiftSend" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 30000,
      },
    });
    return true;
  } catch {
    return false;
  }
}
