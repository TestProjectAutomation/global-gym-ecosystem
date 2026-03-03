// mobile/lib/screens/dashboard_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/language_service.dart';
import '../services/calendar_service.dart';
import '../widgets/language_selector.dart';

class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final languageService = Provider.of<LanguageService>(context);
    final calendarService = Provider.of<CalendarService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(languageService.translate('dashboard')),
        actions: [
          LanguageSelector(),
        ],
      ),
      body: Directionality(
        textDirection: languageService.isRTL ? TextDirection.rtl : TextDirection.ltr,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              // Stats cards
              GridView.count(
                shrinkWrap: true,
                crossAxisCount: 2,
                childAspectRatio: 1.5,
                children: [
                  _buildStatCard(
                    context,
                    'total_members',
                    '150',
                    Icons.people,
                  ),
                  _buildStatCard(
                    context,
                    'active_memberships',
                    '120',
                    Icons.credit_card,
                  ),
                  _buildStatCard(
                    context,
                    'today_checkins',
                    '45',
                    Icons.login,
                  ),
                  _buildStatCard(
                    context,
                    'revenue_month',
                    '\$5,000',
                    Icons.attach_money,
                  ),
                ],
              ),
              
              SizedBox(height: 20),
              
              // Calendar info
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        languageService.translate('today_date'),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        calendarService.getFormattedDate(
                          DateTime.now(),
                          calendarService.currentCalendar,
                        ),
                        style: TextStyle(fontSize: 20),
                      ),
                    ],
                  ),
                ),
              ),
              
              SizedBox(height: 20),
              
              // Recent activity
              Expanded(
                child: ListView(
                  children: [
                    _buildActivityItem(
                      'member_checkin',
                      'John Doe',
                      '10:30 AM',
                    ),
                    _buildActivityItem(
                      'new_membership',
                      'Jane Smith',
                      '09:45 AM',
                    ),
                    _buildActivityItem(
                      'membership_renewal',
                      'Bob Johnson',
                      'Yesterday',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildStatCard(
    BuildContext context,
    String labelKey,
    String value,
    IconData icon,
  ) {
    final languageService = Provider.of<LanguageService>(context, listen: false);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.blue),
            SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              languageService.translate(labelKey),
              style: TextStyle(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildActivityItem(String actionKey, String name, String time) {
    final languageService = Provider.of<LanguageService>(context, listen: false);
    
    return ListTile(
      leading: CircleAvatar(
        child: Text(name[0]),
      ),
      title: Text(name),
      subtitle: Text(languageService.translate(actionKey)),
      trailing: Text(time),
    );
  }
}