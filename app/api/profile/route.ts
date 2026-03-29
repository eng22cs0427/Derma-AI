import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile } from '@/lib/profile-sync';

function isDbTimeout(err: unknown): boolean {
  const code = (err as any)?.code ?? '';
  const msg = ((err as Error)?.message ?? '').toLowerCase();
  return code === 'ETIMEDOUT' || msg.includes('etimedout') || msg.includes('timeout') || msg.includes('connection terminated');
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profile;
    try {
      profile = await getUserProfile(userId);
    } catch (dbErr) {
      if (isDbTimeout(dbErr)) {
        // DB unreachable — return a Clerk-sourced fallback profile so the UI doesn't crash
        const clerkUser = await currentUser();
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';
        const fullName = `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim() || email.split('@')[0];
        console.warn('[Profile API] DB timeout — returning Clerk fallback for', userId);
        return NextResponse.json({
          userId,
          email,
          fullName,
          avatarUrl: clerkUser?.imageUrl ?? null,
          dateOfBirth: null,
          gender: null,
          contactNumber: null,
          address: null,
          city: null,
          state: null,
          country: null,
          postalCode: null,
          bio: null,
          role: 'patient',
          isActive: true,
          isOnboarded: true,  // treat as onboarded so layout doesn't redirect to /onboarding
          medicalInfo: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _dbOffline: true,  // flag so frontend can show a gentle warning
        }, { status: 200 });
      }
      throw dbErr;
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Return profile with all fields including role
    return NextResponse.json(
      {
        userId: profile.userId,
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        contactNumber: profile.contactNumber,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postalCode: profile.postalCode,
        bio: profile.bio,
        role: profile.role || 'patient',
        isActive: profile.isActive,
        isOnboarded: profile.isOnboarded,
        medicalInfo: profile.medicalInfo,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, dateOfBirth, gender, contactNumber, address, city, state, country, postalCode, bio, avatarUrl, isOnboarded, medicalInfo } = body;

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.fullName = fullName;
    
    if (dateOfBirth !== undefined) {
      updates.dateOfBirth = dateOfBirth === '' ? null : dateOfBirth;
    }
    
    if (gender !== undefined) {
      if (gender) {
         // Fix casing to match PG check constraint: 'Male', 'Female', etc.
         const validGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
         updates.gender = validGender;
      } else {
         updates.gender = null;
      }
    }
    
    if (contactNumber !== undefined) updates.contactNumber = contactNumber;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (country !== undefined) updates.country = country;
    if (postalCode !== undefined) updates.postalCode = postalCode;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (isOnboarded !== undefined) updates.isOnboarded = isOnboarded;
    if (medicalInfo !== undefined) updates.medicalInfo = medicalInfo;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await updateUserProfile(userId, updates);
    const updatedProfile = await getUserProfile(userId);

    return NextResponse.json(updatedProfile, { status: 200 });
  } catch (error) {
    console.error('PUT /api/profile error:', error);
    if (isDbTimeout(error)) {
      return NextResponse.json(
        { error: 'Database is currently unreachable. Changes could not be saved. Please try again shortly.', _dbOffline: true },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
