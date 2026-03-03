// desktop/src/LanguageManager.h

#ifndef LANGUAGEMANAGER_H
#define LANGUAGEMANAGER_H

#include <QObject>
#include <QMap>
#include <QTranslator>
#include <QCoreApplication>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QJsonDocument>
#include <QJsonObject>
#include <QApplication>
#include <QLocale>

class LanguageManager : public QObject
{
    Q_OBJECT

public:
    static LanguageManager* instance();
    
    bool loadLanguage(const QString& languageCode);
    QString translate(const QString& key, const QString& defaultText = QString());
    QStringList getAvailableLanguages();
    QString getCurrentLanguage() const { return m_currentLanguage; }
    Qt::LayoutDirection getCurrentLayoutDirection() const;
    
    void setUserLanguage(int userId, const QString& languageCode);
    void refreshFromServer();
    
signals:
    void languageChanged();
    void layoutDirectionChanged(Qt::LayoutDirection direction);
    
private slots:
    void onTranslationsReceived(QNetworkReply* reply);
    
private:
    explicit LanguageManager(QObject* parent = nullptr);
    ~LanguageManager();
    
    static LanguageManager* m_instance;
    
    QMap<QString, QMap<QString, QString>> m_translations;
    QMap<QString, Qt::LayoutDirection> m_languageDirections;
    QString m_currentLanguage;
    QString m_fallbackLanguage;
    QTranslator* m_qtTranslator;
    QNetworkAccessManager* m_networkManager;
    
    void loadFromDatabase();
    void updateUiLanguages();
    void applyLanguageToWidgets(QWidget* widget);
};

#endif // LANGUAGEMANAGER_H