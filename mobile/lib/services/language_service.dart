// mobile/lib/services/language_service.dart

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class LanguageService extends ChangeNotifier {
  static final LanguageService _instance = LanguageService._internal();
  
  factory LanguageService() => _instance;
  
  LanguageService._internal();
  
  String _currentLanguage = 'en';
  Map<String, String> _translations = {};
  Map<String, dynamic> _languages = {};
  bool _isRTL = false;
  
  String get currentLanguage => _currentLanguage;
  bool get isRTL => _isRTL;
  
  Future<void> initialize() async {
    await loadLanguages();
    await loadSavedLanguage();
    await loadTranslations(_currentLanguage);
  }
  
  Future<void> loadLanguages() async {
    try {
      final response = await http.get(
        Uri.parse('https://api.gym-ecosystem.com/api/languages')
      );
      
      if (response.statusCode == 200) {
        _languages = json.decode(response.body);
      }
    } catch (e) {
      print('Failed to load languages: $e');
    }
  }
  
  Future<void> loadSavedLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    _currentLanguage = prefs.getString('language') ?? 'en';
    _isRTL = _currentLanguage == 'ar' || 
             _currentLanguage == 'he' || 
             _currentLanguage == 'fa' ||
             _currentLanguage == 'ur';
  }
  
  Future<void> loadTranslations(String languageCode) async {
    try {
      final response = await http.get(
        Uri.parse('https://api.gym-ecosystem.com/api/translations/$languageCode')
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        _translations = data.map((key, value) => MapEntry(key, value.toString()));
        
        // Save preference
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('language', languageCode);
        
        _currentLanguage = languageCode;
        _isRTL = languageCode == 'ar' || 
                 languageCode == 'he' || 
                 languageCode == 'fa' ||
                 languageCode == 'ur';
        
        notifyListeners();
      }
    } catch (e) {
      print('Failed to load translations: $e');
    }
  }
  
  String translate(String key, {Map<String, String>? params}) {
    String text = _translations[key] ?? key;
    
    if (params != null) {
      params.forEach((paramKey, paramValue) {
        text = text.replaceAll('{{$paramKey}}', paramValue);
      });
    }
    
    return text;
  }
  
  Future<void> setLanguage(String languageCode) async {
    await loadTranslations(languageCode);
  }
}