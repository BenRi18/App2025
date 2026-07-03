// FrontEnd/navigation/LinkingConfiguration.js
// Deep-link configuration for React Navigation.
//
// Scheme: "myapp"  (set in app.json → expo.scheme)
// Examples:
//   myapp://reset-password?token=XXX&email=YYY&role=user
//   myapp://verify-email?token=XXX&email=YYY&role=user

export const LinkingConfiguration = {
  prefixes: ["myapp://", "https://yourapp.com"],
  config: {
    screens: {
      // Auth screens
      RoleSelection:  "role-selection",
      Login:          "login",
      Register:       "register",
      ForgotPassword: "forgot-password",

      // Deep-linked auth screens (token + email passed as query params)
      ResetPassword: {
        path:  "reset-password",
        parse: {
          token: (token) => token,
          email: (email) => decodeURIComponent(email),
          role:  (role)  => role,
        },
      },
      VerifyEmail: {
        path:  "verify-email",
        parse: {
          token: (token) => token,
          email: (email) => decodeURIComponent(email),
          role:  (role)  => role,
        },
      },
    },
  },
};
