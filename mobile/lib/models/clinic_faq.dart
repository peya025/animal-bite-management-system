class FaqItemData {
  const FaqItemData({
    required this.category,
    required this.question,
    required this.answer,
  });

  final String category;
  final String question;
  final String answer;
}

const List<FaqItemData> kClinicFaqs = [
  FaqItemData(
    category: 'FIRST AID',
    question: 'What should I do immediately after an animal bite or scratch?',
    answer:
        'Wash the wound immediately and thoroughly under running water with soap for at least 15 minutes, then apply povidone-iodine or 70% alcohol. Do NOT apply garlic, vinegar, toothpaste, or cover the wound tightly.',
  ),
  FaqItemData(
    category: 'PEP SCHEDULE',
    question: 'What is the standard rabies vaccination (PEP) schedule?',
    answer:
        'Under the DOH 2-site intradermal (ID) regimen, primary Post-Exposure Prophylaxis consists of 3 clinic visits: Day 0 (first dose), Day 3, and Day 7. Completing all 3 doses on time is critical for full protection.',
  ),
  FaqItemData(
    category: 'MISSED DOSE',
    question: 'What happens if I miss my scheduled Day 3 or Day 7 dose?',
    answer:
        'Visit the clinic as soon as possible. Depending on how many days have elapsed and how many doses you already received, the clinic physician will either resume and shift your remaining schedule or restart the series.',
  ),
  FaqItemData(
    category: 'BOOSTER / RE-EXPOSURE',
    question:
        'Do I need the full 3-dose series if I was already vaccinated before?',
    answer:
        'No. If you have a verified completed 3-dose primary PEP series on record, a new bite exposure only requires 2 booster doses (Day 0 and Day 3) without Rabies Immunoglobulin (RIG).',
  ),
  FaqItemData(
    category: 'ANIMAL OBSERVATION',
    question: 'Why do I need to observe the biting dog or cat for 14 days?',
    answer:
        'If a domestic dog or cat remains healthy and alive after 14 days of observation from the date of the bite, it was not shedding rabies virus in its saliva at the time of exposure. If the animal becomes sick, dies, or goes missing within 14 days, inform the clinic immediately.',
  ),
  FaqItemData(
    category: 'DIGITAL CARD & COVERAGE',
    question:
        'How do I access my Digital Vaccination Card and PhilHealth coverage?',
    answer:
        'Once your patient profile is verified at the clinic, tap the center QR button on the bottom navigation bar to view your official Digital Vaccination Card. You can flip the card to inspect batch numbers or swipe left to view past vaccination history.',
  ),
];
