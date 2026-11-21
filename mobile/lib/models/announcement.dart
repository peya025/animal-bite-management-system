class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    required this.message,
    this.imageUrl,
    this.isUrgent = false,
  });

  final int id;
  final String title;
  final String message;
  final String? imageUrl;
  final bool isUrgent;

  factory Announcement.fromJson(Map<String, dynamic> json) {
    final image = Uri.tryParse(json['image_url']?.toString() ?? '');
    return Announcement(
      id: int.parse(json['id'].toString()),
      title: json['title'] as String,
      message: json['message'] as String,
      imageUrl:
          image != null &&
              image.hasAuthority &&
              ['http', 'https'].contains(image.scheme)
          ? image.toString()
          : null,
      isUrgent: json['is_urgent'] == true,
    );
  }
}
