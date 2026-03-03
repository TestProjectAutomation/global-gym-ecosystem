// desktop/src/LanguageManager.cpp

#include "LanguageManager.h"
#include <QDir>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QDebug>
#include <QApplication>
#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QMenu>
#include <QAction>
#include <QSqlQuery>
#include <QSqlError>
#include <QSettings>

LanguageManager* LanguageManager::m_instance = nullptr;

LanguageManager::LanguageManager(QObject* parent)
    : QObject(parent)
    , m_fallbackLanguage("en")
    , m_qtTranslator(new QTranslator(this))
    , m_networkManager(new QNetworkAccessManager(this))
{
    // Set default layout direction
    m_languageDirections.insert("en", Qt::LeftToRight);
    m_languageDirections.insert("ar", Qt::RightToLeft);
    m_languageDirections.insert("he", Qt::RightToLeft);
    m_languageDirections.insert("fa", Qt::RightToLeft);
    m_languageDirections.insert("ur", Qt::RightToLeft);
    
    // Load saved language preference
    QSettings settings;
    m_currentLanguage = settings.value("language", "en").toString();
    
    connect(m_networkManager, &QNetworkAccessManager::finished,
            this, &LanguageManager::onTranslationsReceived);
    
    loadFromDatabase();
}

LanguageManager::~LanguageManager()
{
}

LanguageManager* LanguageManager::instance()
{
    if (!m_instance) {
        m_instance = new LanguageManager(qApp);
    }
    return m_instance;
}

bool LanguageManager::loadLanguage(const QString& languageCode)
{
    if (languageCode == m_currentLanguage) {
        return true;
    }
    
    if (!m_translations.contains(languageCode)) {
        // Try to load from server
        QNetworkRequest request(QUrl("http://localhost:3000/api/translations/" + languageCode));
        m_networkManager->get(request);
        return false;
    }
    
    m_currentLanguage = languageCode;
    
    // Save preference
    QSettings settings;
    settings.setValue("language", languageCode);
    
    // Update UI
    updateUiLanguages();
    
    // Emit signals
    emit languageChanged();
    
    Qt::LayoutDirection newDirection = getCurrentLayoutDirection();
    if (qApp->layoutDirection() != newDirection) {
        qApp->setLayoutDirection(newDirection);
        emit layoutDirectionChanged(newDirection);
    }
    
    return true;
}

QString LanguageManager::translate(const QString& key, const QString& defaultText)
{
    if (m_translations.contains(m_currentLanguage) &&
        m_translations[m_currentLanguage].contains(key)) {
        return m_translations[m_currentLanguage][key];
    }
    
    // Try fallback language
    if (m_translations.contains(m_fallbackLanguage) &&
        m_translations[m_fallbackLanguage].contains(key)) {
        return m_translations[m_fallbackLanguage][key];
    }
    
    // Return key or default text
    return defaultText.isEmpty() ? key : defaultText;
}

QStringList LanguageManager::getAvailableLanguages()
{
    return m_translations.keys();
}

Qt::LayoutDirection LanguageManager::getCurrentLayoutDirection() const
{
    return m_languageDirections.value(m_currentLanguage, Qt::LeftToRight);
}

void LanguageManager::setUserLanguage(int userId, const QString& languageCode)
{
    QSqlQuery query;
    query.prepare("UPDATE users SET preferred_language_id = "
                  "(SELECT id FROM languages WHERE code = ?) WHERE id = ?");
    query.addBindValue(languageCode);
    query.addBindValue(userId);
    
    if (query.exec()) {
        loadLanguage(languageCode);
    }
}

void LanguageManager::refreshFromServer()
{
    QNetworkRequest request(QUrl("http://localhost:3000/api/translations/all"));
    m_networkManager->get(request);
}

void LanguageManager::onTranslationsReceived(QNetworkReply* reply)
{
    if (reply->error() == QNetworkReply::NoError) {
        QByteArray data = reply->readAll();
        QJsonDocument doc = QJsonDocument::fromJson(data);
        QJsonObject obj = doc.object();
        
        // Parse and store translations
        for (const QString& lang : obj.keys()) {
            QJsonObject langObj = obj[lang].toObject();
            QMap<QString, QString> translations;
            
            for (const QString& key : langObj.keys()) {
                translations.insert(key, langObj[key].toString());
            }
            
            m_translations.insert(lang, translations);
        }
        
        // Reload current language if needed
        if (!m_translations.contains(m_currentLanguage)) {
            loadLanguage(m_fallbackLanguage);
        } else {
            updateUiLanguages();
        }
    }
    
    reply->deleteLater();
}

void LanguageManager::loadFromDatabase()
{
    QSqlQuery query;
    query.exec("SELECT l.code, tk.key_name, t.value "
               "FROM translations t "
               "JOIN translation_keys tk ON t.key_id = tk.id "
               "JOIN languages l ON t.language_id = l.id "
               "WHERE l.is_active = true");
    
    while (query.next()) {
        QString langCode = query.value(0).toString();
        QString key = query.value(1).toString();
        QString value = query.value(2).toString();
        
        if (!m_translations.contains(langCode)) {
            m_translations.insert(langCode, QMap<QString, QString>());
        }
        
        m_translations[langCode].insert(key, value);
    }
}

void LanguageManager::updateUiLanguages()
{
    // Update all top-level widgets
    for (QWidget* widget : qApp->topLevelWidgets()) {
        applyLanguageToWidgets(widget);
    }
}

void LanguageManager::applyLanguageToWidgets(QWidget* widget)
{
    // Update widget's text if it has a translatable property
    QString objectName = widget->objectName();
    if (!objectName.isEmpty() && objectName.startsWith("tr_")) {
        QString key = objectName.mid(3); // Remove "tr_" prefix
        QString translation = translate(key);
        
        if (QLabel* label = qobject_cast<QLabel*>(widget)) {
            label->setText(translation);
        } else if (QPushButton* button = qobject_cast<QPushButton*>(widget)) {
            button->setText(translation);
        } else if (QMenu* menu = qobject_cast<QMenu*>(widget)) {
            menu->setTitle(translation);
        }
    }
    
    // Update all child widgets recursively
    for (QObject* child : widget->children()) {
        if (QWidget* childWidget = qobject_cast<QWidget*>(child)) {
            applyLanguageToWidgets(childWidget);
        }
    }
}