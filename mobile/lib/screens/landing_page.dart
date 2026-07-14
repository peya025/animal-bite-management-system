import 'package:flutter/material.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final ScrollController _scrollController = ScrollController();

  // Yellow-Green Color Palette
  static const Color primaryGreen = Color(0xFF84cc16);
  static const Color primaryDark = Color(0xFF65a30d);
  static const Color primaryLight = Color(0xFFdcfce7);
  static const Color white = Color(0xFFffffff);
  static const Color gray50 = Color(0xFFf9fafb);
  static const Color gray100 = Color(0xFFf3f4f6);
  static const Color gray500 = Color(0xFF6b7280);
  static const Color gray700 = Color(0xFF374151);

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: white,
      body: SingleChildScrollView(
        controller: _scrollController,
        child: Column(
          children: [
            // App Bar
            _buildAppBar(),
            // Hero Section
            _buildHeroSection(),
            // Features Section
            _buildFeaturesSection(),
            // How It Works Section
            _buildHowItWorks(),
            // CTA Section
            _buildCTASection(),
            // Footer
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      color: white,
      child: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.pets,
                    color: primaryGreen,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'AnimalCare',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: primaryGreen,
                  ),
                ),
              ],
            ),
            GestureDetector(
              onTap: () {
                Navigator.of(context).pushNamed('/login');
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: primaryGreen,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'Sign In',
                  style: TextStyle(
                    color: white,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [primaryLight, primaryGreen],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.health_and_safety,
              size: 48,
              color: primaryDark,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Animal Bite Management',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: gray700,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Real-time incident tracking and case management system',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: gray500,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(context).pushNamed('/login');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryGreen,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Get Started',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: white,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Stats
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildStatCard('2,500+', 'Cases Managed'),
              _buildStatCard('98%', 'Accuracy'),
              _buildStatCard('24/7', 'Support'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String number, String label) {
    return Column(
      children: [
        Text(
          number,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: primaryGreen,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 12,
            color: gray500,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildFeaturesSection() {
    final features = [
      {
        'icon': Icons.speed,
        'title': 'Real-time Tracking',
        'description': 'Monitor incidents instantly with live alerts'
      },
      {
        'icon': Icons.security,
        'title': 'Secure & Compliant',
        'description': 'HIPAA-ready with end-to-end encryption'
      },
      {
        'icon': Icons.analytics,
        'title': 'Analytics',
        'description': 'Comprehensive reports and insights'
      },
      {
        'icon': Icons.people,
        'title': 'Collaboration',
        'description': 'Share data with healthcare teams'
      },
      {
        'icon': Icons.phone_iphone,
        'title': 'Mobile App',
        'description': 'Manage cases on-the-go'
      },
      {
        'icon': Icons.integration_instructions,
        'title': 'Easy Integration',
        'description': 'Works with existing systems'
      },
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      color: gray50,
      child: Column(
        children: [
          const Text(
            'Powerful Features',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: gray700,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Everything you need to manage incidents efficiently',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: gray500,
            ),
          ),
          const SizedBox(height: 32),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1,
            ),
            itemCount: features.length,
            itemBuilder: (context, index) {
              final feature = features[index];
              return _buildFeatureCard(
                feature['icon'] as IconData,
                feature['title'] as String,
                feature['description'] as String,
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCard(IconData icon, String title, String description) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          top: BorderSide(color: primaryGreen, width: 3),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: primaryDark,
              size: 24,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: gray700,
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: Text(
              description,
              style: const TextStyle(
                fontSize: 12,
                color: gray500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHowItWorks() {
    final steps = [
      {'number': '1', 'title': 'Report', 'desc': 'Report incidents quickly'},
      {'number': '2', 'title': 'Assess', 'desc': 'Automatic risk evaluation'},
      {'number': '3', 'title': 'Action', 'desc': 'Generate action plans'},
      {'number': '4', 'title': 'Monitor', 'desc': 'Track patient recovery'},
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      child: Column(
        children: [
          const Text(
            'How It Works',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: gray700,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Simple workflow for incident management',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: gray500,
            ),
          ),
          const SizedBox(height: 32),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: steps.length,
            separatorBuilder: (context, index) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Center(
                child: Icon(
                  Icons.arrow_downward,
                  color: primaryGreen,
                  size: 28,
                ),
              ),
            ),
            itemBuilder: (context, index) {
              final step = steps[index];
              return Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: gray50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: primaryGreen,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: primaryGreen.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          step['number']!,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            step['title']!,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: gray700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            step['desc']!,
                            style: const TextStyle(
                              fontSize: 14,
                              color: gray500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCTASection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [primaryGreen, primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        children: [
          const Text(
            'Ready to Get Started?',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: white,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Join healthcare facilities already managing animal bite incidents with AnimalCare',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              color: Color(0xFFe8f5e9),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(context).pushNamed('/login');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Start Free Trial',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: primaryGreen,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
      color: const Color(0xFF1f2937),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'AnimalCare',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: primaryGreen,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Animal Bite Management & Monitoring System',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF9ca3af),
            ),
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () {},
                child: const Text(
                  'Privacy',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9ca3af),
                  ),
                ),
              ),
              TextButton(
                onPressed: () {},
                child: const Text(
                  'Terms',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9ca3af),
                  ),
                ),
              ),
              TextButton(
                onPressed: () {},
                child: const Text(
                  'Contact',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9ca3af),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            '© 2024 AnimalCare. All rights reserved.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: Color(0xFF6b7280),
            ),
          ),
        ],
      ),
    );
  }
}
