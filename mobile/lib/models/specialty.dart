class Specialty {
  final String id;
  final String name;
  final String? description;
  final String? iconName;
  final int doctorsCount;

  Specialty({
    required this.id,
    required this.name,
    this.description,
    this.iconName,
    this.doctorsCount = 0,
  });

  factory Specialty.fromJson(Map<String, dynamic> json) {
    int count = 0;
    if (json['_count'] != null && json['_count'] is Map) {
      count = (json['_count']['doctors'] as num?)?.toInt() ?? 0;
    } else if (json['doctorsCount'] != null) {
      count = (json['doctorsCount'] as num).toInt();
    } else if (json['doctors'] != null && json['doctors'] is List) {
      count = (json['doctors'] as List).length;
    }

    return Specialty(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      iconName: json['iconName'] as String?,
      doctorsCount: count,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'iconName': iconName,
      'doctorsCount': doctorsCount,
    };
  }
}
