# MMM-PhoenixTrashDay

A [MagicMirror²](https://github.com/MichMich/MagicMirror) module that shows the next curbside trash/recycle pickup day for a given address in Phoenix, AZ.

<p align="center">
  <img src="https://img.shields.io/github/license/omac049/MMM-PhoenixTrashDay" alt="License">
  <img src="https://img.shields.io/badge/MagicMirror²-Module-blue.svg" alt="MagicMirror² Module">
  <img src="https://img.shields.io/badge/platform-Phoenix%20AZ-red.svg" alt="Phoenix AZ">
</p>

## 📋 Description

This module displays when your next Phoenix trash/recycling pickup day is scheduled. It shows countdown information for both trash and recycling collection dates, helping Phoenix residents remember when to put out their bins.

The module supports two different methods for retrieving this information:

1. **Legacy ArcGIS Method**: Uses the City of Phoenix ArcGIS REST services to geocode your address and find your collection day.
2. **New Dynamics 365 Portal**: Uses the newer [phxatyourservice.dynamics365portals.us/trashrecycling](https://phxatyourservice.dynamics365portals.us/trashrecycling/) service.

## 🖼️ Screenshots

![MMM-PhoenixTrashDay Example](/path/to/screenshot.png)

## ✨ Features

- Displays next trash and recycling pickup days
- Countdown to next pickup (today, tomorrow, or days remaining)
- Multiple icon libraries and styles
- Customizable appearance
- Automatic refresh
- Fallback to cached data when services are unavailable
- Optional address display
- Debug mode for troubleshooting

## 🔧 Installation

Follow these steps to install the module:

### 1. Clone the repository
```bash
cd ~/MagicMirror/modules
git clone https://github.com/omac049/MMM-PhoenixTrashDay.git
```

### 2. Install dependencies
```bash
cd MMM-PhoenixTrashDay
npm install
```

### 3. Configure the module
Add the module to your `config/config.js` file:

```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",  // Can be any of the available positions
  config: {
    address: "YOUR_PHOENIX_ADDRESS",  // Required: Your Phoenix address
    // ... other optional configuration options
  }
}
```

### 4. Restart MagicMirror²
```bash
pm2 restart MagicMirror  // If using pm2
```
or restart your MagicMirror² manually.

## ⚙️ Configuration Options

| Option                | Description                                                                                            | Default                                                                             |
|-----------------------|--------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `address`             | **Required** - Street address to look up                                                               | `""`                                                                                |
| `updateInterval`      | How often to refresh the trash schedule in milliseconds                                                | `6 * 60 * 60 * 1000` (6 hours)                                                      |
| `debug`               | Show detailed error messages in the UI                                                                 | `false`                                                                             |
| `useDynamicsPortal`   | Use the newer Dynamics 365 portal instead of ArcGIS                                                    | `false`                                                                             |
| `dynamicsPortalUrl`   | URL for the Dynamics 365 portal                                                                        | `"https://phxatyourservice.dynamics365portals.us/trashrecycling/"`                  |
| `geocodeUrl`          | Esri geocoder endpoint (only used if `useDynamicsPortal` is `false`)                                   | `"https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"` |
| `trashLayerUrl`       | Phoenix curbside pickup layer (only used if `useDynamicsPortal` is `false`)                            | `"https://maps.phoenix.gov/pub/rest/services/public/GarbagePickUp/MapServer/2"`    |
| `showIcon`            | Whether to show icons for trash and recycling                                                          | `true`                                                                              |
| `showAddress`         | Whether to show the address information                                                                | `false`                                                                             |
| `showStaleDataNotice` | Show a notice when data might be stale                                                                 | `true`                                                                              |
| `compactMode`         | Use a more compact layout for a sleeker appearance                                                     | `true`                                                                              |
| `iconLibrary`         | Icon library to use ("fontawesome", "material", "ionicons", "feather", "custom")                       | `"fontawesome"`                                                                     |
| `iconSet`             | Icon set style to use ("default", "simple", "colorful", "outline", "custom")                           | `"default"`                                                                         |
| `iconColorStyle`      | Icon color style ("colored", "monochrome")                                                             | `"colored"`                                                                         |
| `customIconPath`      | Path to custom icons if iconLibrary = "custom"                                                          | `"/modules/MMM-PhoenixTrashDay/icons/"`                                             |
| `customIcons`         | Custom icon filenames object with properties `trash` and `recycle`                                     | `{trash: "trash.svg", recycle: "recycle.svg"}`                                      |

## ✅ Common Configuration Examples

### Minimal Configuration
```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "123 Main St, Phoenix, AZ"
  }
}
```

### Using FontAwesome Icons with Default Style
```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "123 Main St, Phoenix, AZ",
    iconLibrary: "fontawesome", 
    iconSet: "default"
  }
}
```

### Using Material Icons with Colorful Style
```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "123 Main St, Phoenix, AZ",
    iconLibrary: "material",
    iconSet: "colorful"
  }
}
```

### Using Custom SVG Icons
```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "123 Main St, Phoenix, AZ",
    iconLibrary: "custom",
    customIconPath: "/modules/MMM-PhoenixTrashDay/icons/",
    customIcons: {
      trash: "colorful-trash.svg", 
      recycle: "colorful-recycle.svg"
    }
  }
}
```

### Monochrome Icons
```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "123 Main St, Phoenix, AZ",
    iconLibrary: "fontawesome",
    iconSet: "outline",
    iconColorStyle: "monochrome"
  }
}
```

### Using the Dynamics 365 Portal (Recommended)
```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "123 Main St, Phoenix, AZ",
    useDynamicsPortal: true
  }
}
```

### Sleek Compact Layout
```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "123 Main St, Phoenix, AZ",
    compactMode: true,
    iconSet: "simple"
  }
}
```

## 🔄 Data Sources

### ArcGIS Services (Legacy)
By default, the module uses the City of Phoenix ArcGIS REST services to:
1. Geocode your address (convert it to latitude/longitude)
2. Query the trash pickup layers to find your pickup day

This method has been reliable but may be deprecated in the future.

### Dynamics 365 Portal (Recommended)
The newer City of Phoenix Dynamics 365 Portal is the recommended data source as it's more likely to be maintained and updated. To use it:

```javascript
config: {
  address: "123 Main St, Phoenix, AZ",
  useDynamicsPortal: true
}
```

## 🔍 How It Works

1. The module takes your address and geocodes it to get latitude/longitude coordinates
2. It then queries the City of Phoenix trash/recycling data sources to determine your pickup schedule
3. The module calculates the days until your next pickup
4. The information is displayed in a clean, easy-to-read format
5. The data refreshes automatically according to your `updateInterval` setting

## ⚠️ Troubleshooting

If you encounter issues with the module not displaying your trash day:

### 1. Enable Debug Mode
```javascript
config: {
  address: "123 Main St, Phoenix, AZ",
  debug: true
}
```
This will show detailed error messages in the module's UI.

### 2. Check the MagicMirror Logs
```bash
pm2 logs MagicMirror  # If using pm2
```
or check the console output if running manually.

### 3. Try Alternative Data Source
Toggle between data sources to see if one works better:
```javascript
config: {
  useDynamicsPortal: true  // or false to use ArcGIS
}
```

### 4. Verify Address Format
Make sure your address is correctly formatted and within Phoenix city limits.

### 5. Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Address not found" | Verify your address is correctly formatted with street, city, and zip code |
| "No pickup zone found" | Confirm your address is within Phoenix city limits |
| "Network error" | Check your internet connection |
| "Server error" | City of Phoenix services may be temporarily down, the module will use cached data if available |

## 🖼️ Icon Libraries and Sets

### Icon Libraries
The module supports the following icon libraries:

- **FontAwesome**: Wide range of icons, most widely used
- **Material Icons**: Google's Material Design icons
- **Ionicons**: Clean, minimalist icon set
- **Feather**: Simple, elegant SVG icons
- **Custom**: Your own SVG icons placed in the module's `/icons/` directory

### Icon Sets
Four different icon set styles are available:

- **Default**: Standard icons (uses the selected icon library)
- **Simple**: Minimalist icon designs
- **Colorful**: Colorful, vibrant icons
- **Outline**: Outline-style icons
- **Custom**: Your own custom SVG icons

## 🤝 Contributing

Contributions to improve MMM-PhoenixTrashDay are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin new-feature`
5. Submit a pull request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgements

- [MagicMirror²](https://github.com/MichMich/MagicMirror) team for the amazing platform
- City of Phoenix for providing the data services
- OpenAI Nova for the initial module development

## 📧 Support

For questions or issues, please [open an issue](https://github.com/omac049/MMM-PhoenixTrashDay/issues) on GitHub. 