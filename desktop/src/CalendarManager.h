// desktop/src/CalendarManager.h

#ifndef CALENDARMANAGER_H
#define CALENDARMANAGER_H

#include <QObject>
#include <QDate>
#include <QMap>

class CalendarManager : public QObject
{
    Q_OBJECT

public:
    static CalendarManager* instance();
    
    enum CalendarType {
        Gregorian,
        Hijri,
        Persian,
        Custom
    };
    
    QString convertDate(const QDate& date, CalendarType toCalendar);
    QDate convertToGregorian(const QString& dateStr, CalendarType fromCalendar);
    QString formatDate(const QDate& date, CalendarType calendar, const QString& format);
    
    void setUserCalendar(int userId, CalendarType calendar);
    CalendarType getUserCalendar(int userId) const;
    
    bool isRamadan(const QDate& date) const;
    QString getHijriMonthName(int month, const QString& language = QString());
    
signals:
    void calendarChanged(CalendarType newCalendar);
    
private:
    explicit CalendarManager(QObject* parent = nullptr);
    static CalendarManager* m_instance;
    
    QMap<int, CalendarType> m_userPreferences;
    QMap<CalendarType, QString> m_calendarNames;
};

#endif // CALENDARMANAGER_H