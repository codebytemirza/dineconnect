import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword, createUser } from '@/lib/queries';
import { createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check for superadmin fail-safe provisioning
    if (cleanUsername === 'dineconnect' && password === '852004') {
      let adminUser = await getUserByUsername('dineconnect');
      if (!adminUser) {
        adminUser = await createUser({
          id: 'usr_superadmin_01',
          username: 'dineconnect',
          password: '852004',
          role: 'superadmin',
          restaurant_id: null,
          name: 'DineConnect SaaS Owner',
        });
      }

      const token = createSessionToken(adminUser);
      const res = NextResponse.json({
        success: true,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          restaurantId: adminUser.restaurant_id,
          name: adminUser.name,
        },
        redirectUrl: '/admin',
      });

      res.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return res;
    }

    // Lookup user in DB
    const user = await getUserByUsername(cleanUsername);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);
    const redirectUrl = user.role === 'superadmin' ? '/admin' : '/dashboard';

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        restaurantId: user.restaurant_id,
        name: user.name,
      },
      redirectUrl,
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    console.error('Error in login route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
