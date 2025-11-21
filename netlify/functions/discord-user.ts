import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { token, userId } = await req.json();

    if (!token || !userId) {
      return new Response(JSON.stringify({ error: 'Token and userId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch user information from Discord API
    const userResponse = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => ({}));
      return new Response(JSON.stringify({
        error: 'Failed to fetch user data',
        details: errorData
      }), {
        status: userResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userData = await userResponse.json();

    // Try to fetch user's presence/status (requires gateway connection - not available via REST API)
    // We'll return what's available from the user endpoint

    // Try to fetch user's profile (bio/banner)
    const profileResponse = await fetch(`https://discord.com/api/v10/users/${userId}/profile`, {
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let profileData = null;
    if (profileResponse.ok) {
      profileData = await profileResponse.json();
    }

    // Combine the data
    const combinedData = {
      ...userData,
      profile: profileData,
      avatar_url: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${userData.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0') % 5}.png`,
      banner_url: userData.banner
        ? `https://cdn.discordapp.com/banners/${userData.id}/${userData.banner}.${userData.banner.startsWith('a_') ? 'gif' : 'png'}?size=600`
        : null
    };

    return new Response(JSON.stringify(combinedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error fetching Discord data:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
