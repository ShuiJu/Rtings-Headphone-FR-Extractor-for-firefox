# Rtings Headphone Data Extractor

License: MPL 2.0

A Firefox browser extension that extracts frequency response data from Rtings.com headphone graphs for audio analysis and personal use. 
### 🎯 Features

    Automatic Data Extraction: Extracts frequency response data from Rtings.com headphone graph pages
    Interactive Data Viewer: Visualizes extracted data with interactive charts and detailed tables
    CSV Export: Downloads data as CSV files for use in audio analysis software
    Context Menu Integration: Right-click on Rtings.com pages to extract data
    Smart Data Alignment: Automatically calculates bias based on 500Hz alignment to +5dB
    Real-time Preview: Instantly preview extracted data before downloading

### 📦 Installation From Firefox Add-ons Store

#### (Coming soon) 

#### Manual Installation (Developer Mode)

    Download the extension source files
    Open Firefox and navigate to about:debugging
    Click *This Firefox*
    Click *Load Temporary Add-on*
    Select the manifest.json file from the extension directory

### User guide: 

    Navigate to any Rtings.com headphone graph page (e.g., rtings.com/headphones/graph/*)
    Only select one headphone, leave only graph you want to download. (Targets are downloadable.)
    Right-click anywhere on the page
    Select *Extract Headphone Data* from the right-click menu
    The data viewer will open automatically, view what you will download that click download button

### 📁 File Structure



Rtings-Headphone-FR-Extractor-for-firefox/

├── manifest.json              # Extension configuration

├── background.js              # Background script for context menus

├── content.js                 # Main data extraction logic

├── popup.html                 # Extension popup interface

├── popup.js                   # Popup functionality

├── viewer.html               # Data visualization interface

├── viewer.js                 # Chart rendering and data display

├── icons/                    # Extension icons (various sizes)

│   ├── icon16.png

│   ├── icon48.png

│   └── icon128.png

└── README.md                 # This file

### 🔧 Technical Details 
 Data Extraction Process

    Page Detection: Automatically detects Rtings.com headphone graph pages
    Table Parsing: Extracts frequency and amplitude data from HTML tables
    Bias Calculation: Aligns data based on 500Hz reference point
    CSV Generation: Formats data for export
    Storage: Temporarily stores data for preview and download

Supported URL Patterns

    rtings.com/headphones/graph/*
    Pages containing frequency response data tables
    Left/right channel pages (raw-fr-l and raw-fr-r)

### Permissions Required

    activeTab: Access the current tab for data extraction
    contextMenus: Add right-click context menu options
    downloads: Save CSV files to your computer
    storage: Temporarily store extracted data
    Host permission for *://*.rtings.com/*: Access Rtings.com data

### 📊 Data Format CSV Output

#### CSV

Frequency_Hz,Amplitude_dB

20,-2.345678

25,-1.987654

...

20000,3.456789

### Data Points

Each data point contains:

    Frequency (Hz): 20Hz to 20,000Hz range
    Amplitude (dB): Relative sound pressure level
    Bias Adjustment: Automatically aligned to +5dB at 500Hz

🛠️ Development Building from Source

    Clone the repository
    Ensure all files are in the same directory
    Load as temporary extension in Firefox

Modifying the Extension

    Edit content.js to change data extraction logic
    Modify viewer.js to adjust chart rendering
    Update manifest.json for configuration changes



### 📝 License

This project is licensed under the Mozilla Public License 2.0 

### ⚠️ Disclaimer

This extension is designed for personal, non-commercial use only. 

This extension is not affiliated with, endorsed by, or connected to Rtings.com. 

It is an independent tool created for the audio enthusiast community. The extracted data is intended for audio analysis and headphone comparison purposes. Please respect Rtings.com's terms of service and copyright policies. 
### Privacy Notice

    No Data Collection: This extension does not collect any personal or usage data
    Local Processing: All data processing occurs locally in your browser
    No External Transmission: No data is transmitted to external servers
    Temporary Storage: Data is only stored temporarily for preview purposes

### 📚 Resources

    Rtings.com - Source of headphone measurement data
    Mozilla Extension Documentation
    MPL 2.0 License

