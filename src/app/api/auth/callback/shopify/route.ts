import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state');
  const hmac = searchParams.get('hmac');

  // Verify required parameters
  if (!code || !shop || !hmac) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/connect?error=invalid_request`
    );
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Shopify token exchange failed:', errorText);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/connect?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, scope } = tokenData;

    // Get shop details
    const shopResponse = await fetch(`https://${shop}/admin/api/2023-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!shopResponse.ok) {
      throw new Error('Failed to fetch shop details');
    }

    const shopData = await shopResponse.json();
    const shopName = shopData.shop.myshopify_domain;
    const shopEmail = shopData.shop.email;

    // Save or update shop in database
    await prisma.store.upsert({
      where: { shop: shopName },
      update: {
        accessToken: access_token,
        scope: scope,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        shop: shopName,
        accessToken: access_token,
        scope: scope,
        email: shopEmail,
        isActive: true,
      },
    });

    // Redirect to success page or dashboard
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
    );
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/connect?error=server_error`
    );
  }
}
