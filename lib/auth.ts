import AzureADProvider from "next-auth/providers/azure-ad"
import type { NextAuthOptions } from "next-auth"

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      method: "POST",
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error("Error refreshing access token", error)
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid email profile https://graph.microsoft.com/Files.ReadWrite offline_access"
        }
      },
      // Use explicit URLs instead of wellKnown discovery to avoid 404 issues
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      token: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      userinfo: `https://graph.microsoft.com/oidc/userinfo`,
    })
  ],
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account, user, trigger }) {
      if (process.env.NODE_ENV === 'development') {
        console.log('JWT callback - trigger:', trigger, 'account:', !!account, 'user:', !!user, 'token exists:', !!token)
      }
      
      // Initial sign in
      if (account && user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Initial sign in - access token:', !!account.access_token, 'refresh token:', !!account.refresh_token)
        }
        
        if (!account.access_token) {
          console.error('No access token received from Azure AD')
          return { ...token, error: 'No access token received' }
        }
        
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token,
          user,
          error: null,
        }
      }

      // Return previous token if the access token has not expired yet
      const tokenExpiry = (token.accessTokenExpires as number) || 0
      if (Date.now() < tokenExpiry) {
        return token
      }

      // Access token has expired, try to update it
      if (token.refreshToken) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Access token expired, refreshing...')
        }
        return refreshAccessToken(token)
      } else {
        console.error('No refresh token available')
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },
    
    async session({ session, token }) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Session callback - token exists:', !!token, 'has access token:', !!token?.accessToken)
      }
      
      if (token) {
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        session.expiresAt = token.accessTokenExpires as number
        session.error = token.error as string
      }
      
      return session
    },
    
    async signIn({ user, account, profile }) {
      if (process.env.NODE_ENV === 'development') {
        console.log('SignIn callback - user:', !!user, 'account:', !!account, 'profile:', !!profile)
      }
      
      // Allow sign in if we have the required information
      return !!(account && user)
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    error: '/auth/error',
    signIn: '/auth/signin',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (process.env.NODE_ENV === 'development') {
        console.log('SignIn event - success:', { user: !!user, account: !!account })
      }
    }
  }
}