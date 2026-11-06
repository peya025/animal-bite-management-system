import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/clinic_resource.dart';
import '../utils/external_link_launcher.dart';

class LinkResourceCard extends StatelessWidget {
  const LinkResourceCard({
    super.key,
    required this.resource,
    this.onTapOverride,
  });

  final ClinicResource resource;
  final VoidCallback? onTapOverride;

  String _extractDomain(String rawUrl) {
    try {
      final host = Uri.parse(rawUrl.trim()).host;
      return host.isNotEmpty ? host : rawUrl;
    } catch (_) {
      return rawUrl;
    }
  }

  @override
  Widget build(BuildContext context) {
    final domain = _extractDomain(resource.url);
    final semanticLabel = context.tr(
      'learn_more_link_semantics',
      params: {
        'title': resource.title,
        'domain': domain,
      },
    );

    return Semantics(
      button: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: const Color(0xFFE5E7EB),
            width: 0.5,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTapOverride ?? () => openExternal(context, resource.url),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                vertical: 12,
                horizontal: 14,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.account_balance_outlined,
                      size: 20,
                      color: Color(0xFF3B82F6),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          resource.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF111827),
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.language_rounded,
                              size: 12,
                              color: Color(0xFF9CA3AF),
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                domain,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF9CA3AF),
                                  height: 1.2,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Icon(
                    Icons.open_in_new_rounded,
                    size: 16,
                    color: Color(0xFF9CA3AF),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
