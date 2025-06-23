import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

interface AuthenticatedUser {
  id: string;
  role: string;
  roles?: string[];
  email?: string;
  name?: string;
}

interface AuthResult {
  success: true;
  user: AuthenticatedUser;
}

interface AuthError {
  success: false;
  error: string;
  status: number;
}

type AuthResponse = AuthResult | AuthError;

/**
 * Get authenticated user from JWT token
 * @param request - The NextRequest object
 * @returns Promise with user data or error
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthResponse> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
        status: 401,
      };
    }

    if (!token.id) {
      return {
        success: false,
        error: "Invalid token: missing user ID",
        status: 401,
      };
    }

    return {
        success: true,
        user: {
          id: token.id as string,
          role: token.role as string,
          roles: token.roles as string[],
          email: token.email as string,
          name: token.name as string,
        },
      };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      error: "Authentication failed",
      status: 500,
    };
  }
}

/**
 * Require specific roles for access
 * @param user - The authenticated user
 * @param requiredRoles - Array of required roles
 * @returns AuthError if user doesn't have required roles, null if authorized
 */
export function requireRoles(
  user: AuthenticatedUser,
  requiredRoles: string[]
): AuthError | null {
  if (!requiredRoles.includes(user.role)) {
    return {
      success: false,
      error: `Access denied. Required roles: ${requiredRoles.join(", ")}`,
      status: 403,
    };
  }
  return null;
}

/**
 * Helper function to create error responses
 * @param error - The auth error object
 * @returns Response object
 */
export function createAuthErrorResponse(error: AuthError): Response {
  return new Response(
    JSON.stringify({ error: error.error }),
    {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    }
  );
}