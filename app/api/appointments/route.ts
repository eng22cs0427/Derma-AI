import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { query } from '@/lib/aws-database';

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const primaryEmail = user.emailAddresses?.[0]?.emailAddress || '';
    const body = await request.json();
    const { doctorId, doctorName, specialty, appointmentDate, appointmentTime, type, fee } = body;

    // 1. Get exact patient profile ID
    let patientRes = await query(
      `SELECT id FROM profiles WHERE cognito_user_id = $1 OR email = $2 LIMIT 1`,
      [user.id, primaryEmail]
    );

    let patientId;
    if (patientRes.rows.length === 0) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || primaryEmail.split('@')[0];
      const insertRes = await query(
        `INSERT INTO profiles (cognito_user_id, email, full_name, role) VALUES ($1, $2, $3, 'patient') RETURNING id`,
        [user.id, primaryEmail, fullName]
      );
      patientId = insertRes.rows[0].id;
    } else {
      patientId = patientRes.rows[0].id;
    }

    // 2. Insert into appointments table
    let dbDoctorId = null;
    if (typeof doctorId === 'string' && doctorId.includes('-')) {
      // It's a real doctor ID from the database (UUID format)
      dbDoctorId = doctorId;
    }

    await query(
      `INSERT INTO appointments (patient_id, doctor_id, doctor_name, specialty, appointment_date, appointment_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled')`,
      [patientId, dbDoctorId, doctorName, specialty, appointmentDate, appointmentTime]
    );

    // 3. Create Doctor Notification if real doctor
    if (dbDoctorId) {
      await query(
        `INSERT INTO doctor_notifications (doctor_id, patient_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, 'Appointment', '/doctor-dashboard/appointments')`,
        [
          dbDoctorId,
          patientId,
          "New Appointment Booked",
          `A new appointment was booked with you for ${appointmentDate} at ${appointmentTime}.`
        ]
      );
    } else {
      // If it's a dummy doctor, let's create a notification for any doctor who views the portal just as a general test
      // Actually, standard notification to all doctors for demo purposes
      await query(
        `INSERT INTO doctor_notifications (doctor_id, patient_id, title, message, type, link)
         SELECT id, $1, $2, $3, 'Appointment', '/doctor-dashboard/appointments'
         FROM profiles WHERE role = 'doctor' AND is_active = true`,
        [
          patientId,
          "New Appointment (Demo)",
          `Patient booked with ${doctorName} on ${appointmentDate} at ${appointmentTime}.`
        ]
      );
    }

    // 4. Save to patient's medical history so they can also track it
    await query(
      `INSERT INTO medical_history (user_id, type, data, details)
       VALUES ($1, 'Appointment', $2, $3)`,
      [
         patientId,
         `Consultation — ${doctorName}`,
         JSON.stringify({
           Doctor_Name: doctorName,
           Specialty: specialty,
           Date: appointmentDate,
           Time: appointmentTime,
           Type: type,
           Fee: fee
         })
      ]
    );

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('POST /api/appointments error:', error);
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 });
  }
}
