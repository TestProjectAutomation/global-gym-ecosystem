// desktop/src/MainWindow.cpp

#include "MainWindow.h"
#include "LanguageManager.h"
#include "CalendarManager.h"
#include <QMenuBar>
#include <QToolBar>
#include <QStatusBar>
#include <QDockWidget>
#include <QTabWidget>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QComboBox>
#include <QMessageBox>

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
{
    setupUi();
    setupLanguageMenu();
    setupCalendarMenu();
    setupConnections();
    
    // Apply current language
    LanguageManager::instance()->loadLanguage(
        LanguageManager::instance()->getCurrentLanguage()
    );
}

void MainWindow::setupUi()
{
    // Create central widget
    QWidget* centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);
    
    QVBoxLayout* mainLayout = new QVBoxLayout(centralWidget);
    
    // Header
    QHBoxLayout* headerLayout = new QHBoxLayout();
    QLabel* titleLabel = new QLabel(this);
    titleLabel->setObjectName("tr_app_title");
    titleLabel->setStyleSheet("font-size: 24px; font-weight: bold;");
    headerLayout->addWidget(titleLabel);
    headerLayout->addStretch();
    
    // Language selector
    m_languageCombo = new QComboBox(this);
    headerLayout->addWidget(m_languageCombo);
    
    mainLayout->addLayout(headerLayout);
    
    // Tab widget
    QTabWidget* tabWidget = new QTabWidget(this);
    tabWidget->addTab(createDashboardTab(), tr("Dashboard"));
    tabWidget->addTab(createMembersTab(), tr("Members"));
    tabWidget->addTab(createAttendanceTab(), tr("Attendance"));
    tabWidget->addTab(createReportsTab(), tr("Reports"));
    tabWidget->addTab(createSettingsTab(), tr("Settings"));
    
    mainLayout->addWidget(tabWidget);
    
    // Status bar
    statusBar()->showMessage(tr("Ready"));
}

QWidget* MainWindow::createDashboardTab()
{
    QWidget* widget = new QWidget(this);
    QVBoxLayout* layout = new QVBoxLayout(widget);
    
    // Stats cards
    QHBoxLayout* statsLayout = new QHBoxLayout();
    
    statsLayout->addWidget(createStatCard("tr_total_members", "0"));
    statsLayout->addWidget(createStatCard("tr_active_memberships", "0"));
    statsLayout->addWidget(createStatCard("tr_today_checkins", "0"));
    statsLayout->addWidget(createStatCard("tr_revenue_month", "$0"));
    
    layout->addLayout(statsLayout);
    
    // Charts
    QHBoxLayout* chartsLayout = new QHBoxLayout();
    
    // Attendance chart placeholder
    QLabel* attendanceChart = new QLabel(this);
    attendanceChart->setObjectName("tr_attendance_chart");
    attendanceChart->setMinimumHeight(300);
    attendanceChart->setStyleSheet("border: 1px solid #ccc;");
    chartsLayout->addWidget(attendanceChart);
    
    layout->addLayout(chartsLayout);
    
    return widget;
}

QWidget* MainWindow::createStatCard(const QString& titleKey, const QString& value)
{
    QFrame* card = new QFrame(this);
    card->setFrameStyle(QFrame::StyledPanel);
    card->setStyleSheet("QFrame { background-color: white; border-radius: 10px; padding: 15px; }");
    
    QVBoxLayout* layout = new QVBoxLayout(card);
    
    QLabel* titleLabel = new QLabel(this);
    titleLabel->setObjectName(titleKey);
    titleLabel->setStyleSheet("color: #666; font-size: 14px;");
    layout->addWidget(titleLabel);
    
    QLabel* valueLabel = new QLabel(value, this);
    valueLabel->setStyleSheet("font-size: 28px; font-weight: bold; color: #333;");
    layout->addWidget(valueLabel);
    
    return card;
}

void MainWindow::setupLanguageMenu()
{
    // Populate language combo box
    QStringList languages = LanguageManager::instance()->getAvailableLanguages();
    m_languageCombo->addItems(languages);
    m_languageCombo->setCurrentText(LanguageManager::instance()->getCurrentLanguage());
    
    connect(m_languageCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
            [this](int index) {
        QString languageCode = m_languageCombo->itemText(index);
        LanguageManager::instance()->loadLanguage(languageCode);
    });
}

void MainWindow::setupCalendarMenu()
{
    // Add calendar menu to menu bar
    QMenu* calendarMenu = menuBar()->addMenu(tr("Calendar"));
    
    QActionGroup* calendarGroup = new QActionGroup(this);
    
    QAction* gregorianAction = calendarMenu->addAction(tr("Gregorian"));
    gregorianAction->setCheckable(true);
    gregorianAction->setChecked(true);
    calendarGroup->addAction(gregorianAction);
    
    QAction* hijriAction = calendarMenu->addAction(tr("Hijri"));
    hijriAction->setCheckable(true);
    calendarGroup->addAction(hijriAction);
    
    QAction* persianAction = calendarMenu->addAction(tr("Persian"));
    persianAction->setCheckable(true);
    calendarGroup->addAction(persianAction);
    
    QAction* bothAction = calendarMenu->addAction(tr("Show Both"));
    bothAction->setCheckable(true);
    calendarGroup->addAction(bothAction);
    
    connect(calendarGroup, &QActionGroup::triggered,
            [this](QAction* action) {
        // Handle calendar change
        if (action->text() == tr("Hijri")) {
            // Switch to Hijri calendar
        }
    });
}

void MainWindow::setupConnections()
{
    connect(LanguageManager::instance(), &LanguageManager::languageChanged,
            this, &MainWindow::onLanguageChanged);
    
    connect(LanguageManager::instance(), &LanguageManager::layoutDirectionChanged,
            this, &MainWindow::onLayoutDirectionChanged);
}

void MainWindow::onLanguageChanged()
{
    // Update window title
    setWindowTitle(LanguageManager::instance()->translate("app_title", "Gym Management System"));
    
    // Update status bar
    statusBar()->showMessage(LanguageManager::instance()->translate("ready", "Ready"));
    
    // Refresh UI
    update();
}

void MainWindow::onLayoutDirectionChanged(Qt::LayoutDirection direction)
{
    // Update layout direction
    setLayoutDirection(direction);
    
    // Adjust icon positions if needed
    // Icons should be mirrored for RTL languages
}