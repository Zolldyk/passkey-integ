import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Welcome/Onboarding Screen
 * Displays project introduction and provides entry point to wallet features.
 */
export default function WelcomeScreen() {
  const handleGetStarted = () => {
    // Placeholder - functionality will be added in future stories
    console.log('Get Started pressed');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lazorkit Mobile Wallet Starter</Text>

        <Text style={styles.description}>
          Experience seamless biometric wallet authentication powered by WebAuthn passkeys.
          No seed phrases, no passwords—just your fingerprint or face.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          accessibilityRole="button"
          accessibilityLabel="Get Started with Lazorkit Wallet"
          accessibilityHint="Opens the wallet authentication flow"
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Neutral background for clean look
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32, // H1 size
    fontWeight: '700', // Bold
    color: '#171717', // Neutral text
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 15, // Body size
    color: '#171717',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#9945FF', // Solana brand purple - primary action color
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minHeight: 48, // Meets accessibility minimum (44pt iOS / 48dp Android)
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600', // Semibold
  },
});
