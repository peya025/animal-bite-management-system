/// Mock data for testing UI without backend
/// Use this when backend is not available

class MockData {
  // Sample patient account
  static const sampleAccount = {
    'id': 1,
    'name': 'Juan Dela Cruz',
    'email': 'juan@example.com',
    'phone': '09123456789',
    'created_at': '2026-01-15T10:00:00.000000Z',
  };

  // Sample patients linked to account
  static const samplePatients = [
    {
      'patient_id': 101,
      'patient_number': 'P-2026-001',
      'name': 'Juan Santos Dela Cruz',
      'first_name': 'Juan',
      'last_name': 'Dela Cruz',
      'middle_name': 'Santos',
      'date_of_birth': '1990-05-15',
      'gender': 'male',
      'contact_number': '09123456789',
      'email': 'juan@example.com',
      'address': '123 Main St, Tagoloan, Misamis Oriental',
      'details': {
        'blood_type': 'O+',
        'civil_status': 'married',
        'address_municipality': 'Tagoloan',
        'address_barangay': 'Poblacion',
        'address_purok': 'Zone 1',
        'philhealth_member': 'yes',
        'philhealth_status': 'member',
        'philhealth_no': '12-345678901-2',
        'philhealth_category': 'fe_private',
        'has_membership': 'yes',
      },
      'memberships': [
        {
          'id': 1,
          'membership_type': 'philhealth',
          'status_value': 'member',
          'category': 'fe_private',
          'membership_id_no': '12-345678901-2',
          'is_active': true,
        },
        {
          'id': 2,
          'membership_type': 'senior_citizen',
          'membership_id_no': 'SC-12345',
          'is_active': true,
        },
      ],
      'pivot': {'relationship': 'self', 'status': 'verified'},
    },
    {
      'patient_id': 102,
      'patient_number': 'P-2026-002',
      'name': 'Maria Santos Dela Cruz',
      'first_name': 'Maria',
      'last_name': 'Dela Cruz',
      'middle_name': 'Santos',
      'date_of_birth': '2010-08-20',
      'gender': 'female',
      'contact_number': '09123456789',
      'address': '123 Main St, Tagoloan, Misamis Oriental',
      'details': {
        'address_municipality': 'Tagoloan',
        'address_barangay': 'Poblacion',
        'address_purok': 'Zone 1',
        'fourps_member': 'yes',
        'fourps_category': 'Beneficiary',
        'has_membership': 'yes',
      },
      'memberships': [
        {
          'id': 3,
          'membership_type': 'fourps',
          'status_value': 'yes',
          'category': 'Beneficiary',
          'is_active': true,
        },
      ],
      'pivot': {'relationship': 'child', 'status': 'pending'},
    },
  ];

  // Sample appointments
  static const sampleAppointments = [
    {
      'id': 1,
      'patient': {
        'id': 101,
        'patient_number': 'P-2026-001',
        'first_name': 'Juan',
        'last_name': 'Dela Cruz',
      },
      'appointment_type': 'vaccination',
      'appointment_date': '2026-08-10',
      'appointment_time': '09:00:00',
      'dose_number': 3,
      'status': 'scheduled',
      'clinic': {
        'name': 'Animal Bite Treatment Center',
        'address': 'Poblacion, Tagoloan',
      },
    },
    {
      'id': 2,
      'patient': {
        'id': 102,
        'patient_number': 'P-2026-002',
        'first_name': 'Maria',
        'last_name': 'Dela Cruz',
      },
      'appointment_type': 'follow_up',
      'appointment_date': '2026-08-15',
      'appointment_time': '10:30:00',
      'dose_number': 7,
      'status': 'scheduled',
      'clinic': {
        'name': 'Animal Bite Treatment Center',
        'address': 'Poblacion, Tagoloan',
      },
    },
    {
      'id': 3,
      'patient': {
        'id': 101,
        'patient_number': 'P-2026-001',
        'first_name': 'Juan',
        'last_name': 'Dela Cruz',
      },
      'appointment_type': 'vaccination',
      'appointment_date': '2026-07-28',
      'appointment_time': '09:00:00',
      'dose_number': 0,
      'status': 'completed',
      'clinic': {
        'name': 'Animal Bite Treatment Center',
        'address': 'Poblacion, Tagoloan',
      },
    },
  ];

  // Sample notifications
  static const sampleNotifications = [
    {
      'id': 1,
      'type': 'appointment_reminder',
      'message':
          'Reminder: You have an appointment tomorrow at 9:00 AM for Day 3 vaccination.',
      'read_at': null,
      'created_at': '2026-08-04T10:00:00.000000Z',
    },
    {
      'id': 2,
      'type': 'appointment_confirmed',
      'message':
          'Your appointment has been confirmed for August 10, 2026 at 9:00 AM.',
      'read_at': '2026-08-04T11:00:00.000000Z',
      'created_at': '2026-08-03T14:30:00.000000Z',
    },
    {
      'id': 3,
      'type': 'vaccination_completed',
      'message':
          'Day 0 vaccination completed. Your next dose is scheduled for August 10, 2026.',
      'read_at': '2026-07-28T10:00:00.000000Z',
      'created_at': '2026-07-28T09:30:00.000000Z',
    },
  ];

  // Sample bite incident data
  static const sampleBiteIncident = {
    'bite_date': '2026-07-25',
    'bite_time': '14:30:00',
    'animal_type': 'dog',
    'provoked': false,
    'bite_location': 'left_hand',
    'wound_category': 'category_2',
    'description': 'Dog bite on left hand, minor wound',
  };
}
