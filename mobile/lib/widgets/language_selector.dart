// mobile/lib/widgets/language_selector.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/language_service.dart';

class LanguageSelector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final languageService = Provider.of<LanguageService>(context);
    
    return PopupMenuButton<String>(
      icon: Icon(Icons.language),
      onSelected: (languageCode) async {
        await languageService.setLanguage(languageCode);
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'en',
          child: Text('English'),
        ),
        PopupMenuItem(
          value: 'ar',
          child: Text('العربية'),
        ),
        PopupMenuItem(
          value: 'fa',
          child: Text('فارسی'),
        ),
        PopupMenuItem(
          value: 'ur',
          child: Text('اردو'),
        ),
      ],
    );
  }
}