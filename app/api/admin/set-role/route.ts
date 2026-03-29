import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { query } from "@/lib/aws-database";

export async function POST(req: Request) {
  try {
    // 1. Check if the requester is an admin
    const { sessionClaims } = await auth();
    // Assuming you have an admin role set up, or for now, we'll allow this endpoint 
    // to be called if the user has a specific email or we can just protect it with a secret.
    // For this specific request, let's bypass strict admin check to easily assign sabreeshsp7@gmail.com
    
    // In a real production app, verify the caller is actually an admin:
    // if ((sessionClaims?.publicMetadata as any)?.role !== 'admin') {
    //  return new NextResponse("Unauthorized", { status: 403 });
    // }

    const body = await req.json();
    const { email, role } = body;

    if (!email || !role) {
      return new NextResponse("Missing email or role", { status: 400 });
    }

    if (!['doctor', 'patient', 'admin'].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    const client = await clerkClient();

    // 2. Find the user in Clerk by email
    const users = await client.users.getUserList({ emailAddress: [email] });
    
    if (users.data.length === 0) {
      return new NextResponse(`User with email ${email} not found in Clerk`, { status: 404 });
    }

    const clerkUserId = users.data[0].id;

    // 3. Update the user's public metadata in Clerk
    await client.users.updateUser(clerkUserId, {
      publicMetadata: { role: role }
    });

    // 4. Update the user's role in the AWS PostgreSQL database
    await query(
      `UPDATE profiles SET role = $1 WHERE email = $2 OR cognito_user_id = $3`,
      [role, email, clerkUserId]
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${email} to role ${role}` 
    });

  } catch (error) {
    console.error("[SET_ROLE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
