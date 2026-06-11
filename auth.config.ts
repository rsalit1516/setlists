import type { NextAuthConfig } from 'next-auth'
import MicrosoftEntraId from 'next-auth/providers/microsoft-entra-id'

export const authConfig = {
  providers: [
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID ?? 'consumers',
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
  },
} satisfies NextAuthConfig
