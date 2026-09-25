/// Referral municipalities and barangays data for pre-arrival facility referral.
library;

const List<Map<String, String>> referralMunicipalities = [
  {'code': 'tagoloan', 'name': 'Tagoloan'},
  {'code': 'cdo', 'name': 'Cagayan de Oro City'},
  {'code': 'balingasag', 'name': 'Balingasag'},
  {'code': 'jasaan', 'name': 'Jasaan'},
  {'code': 'opol', 'name': 'Opol'},
  {'code': 'other', 'name': 'Other / Outside Misamis Oriental'},
];

const Map<String, List<String>> referralBarangaysMap = {
  'tagoloan': [
    'Baluarte',
    'Casinglot',
    'Gracia',
    'Mohon',
    'Natumolan',
    'Poblacion',
    'Rosario',
    'Santa Ana',
    'Santa Cruz',
    'Sugbongcogon',
    'San Francisco',
    'San Isidro',
    'Tugatog',
    'Lower Becerril',
    'Upper Becerril',
  ],
  'cdo': [
    'Agusan',
    'Balulang',
    'Bayabas',
    'Bonbon',
    'Bugo',
    'Bulua',
    'Camaman-an',
    'Carmen',
    'Consolacion',
    'Cugman',
    'Gusa',
    'Iponan',
    'Kauswagan',
    'Lapasan',
    'Macabalan',
    'Macasandig',
    'Nazareth',
    'Poblacion',
    'Puerto',
    'Puntod',
    'Tablon',
  ],
  'balingasag': [
    'Baliwagan',
    'Binitinan',
    'Blanco',
    'Calawag',
    'Camuayan',
    'Cogon',
    'Dansuli',
    'Dumarait',
    'Hermano',
    'Kauswagan',
    'Linabu',
    'Linggangao',
    'Mambayaan',
    'Mandangoa',
    'Napaliran',
    'Poblacion',
    'San Francisco',
    'San Isidro',
    'San Juan',
    'Talusan',
    'Waterfall',
  ],
  'jasaan': [
    'Aplaya',
    'Bobontugan',
    'Corrales',
    'Dana-o',
    'Jampason',
    'Kimaya',
    'Lower Jasaan',
    'Luz Banzon',
    'Natubo',
    'Poblacion',
    'San Antonio',
    'San Isidro',
    'San Nicolas',
    'Solana',
    'Upper Jasaan',
  ],
  'opol': [
    'Barra',
    'Bonbon',
    'Cauyonan',
    'Igpit',
    'Limonda',
    'Lower Patag',
    'Luyong Bonbon',
    'Malanang',
    'Nangcaon',
    'Patag',
    'Poblacion',
    'Taboc',
    'Upper Patag',
  ],
};

/// Generates a suggested facility name based on selected municipality code and barangay name.
String suggestReferralFacility(String municipalityCode, String barangayName) {
  final munObj = referralMunicipalities.firstWhere(
    (m) => m['code'] == municipalityCode,
    orElse: () => {'code': '', 'name': 'Tagoloan'},
  );
  final munName = munObj['name']!;
  if (barangayName.toLowerCase() == 'poblacion') {
    return '$munName Rural Health Unit (RHU) / BHS';
  }
  return 'Barangay $barangayName Health Station (BHS)';
}
