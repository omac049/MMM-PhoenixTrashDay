# MMM-PhoenixTrashDay

A [MagicMirror²](https://github.com/MichMich/MagicMirror) module that shows the next curbside trash/recycle pickup day for a given address in Phoenix, AZ.

## Description

This module displays when your next Phoenix trash/recycling pickup day is scheduled. It supports two different methods for retrieving this information:

1. **Legacy ArcGIS Method**: Uses the City of Phoenix ArcGIS REST services to geocode your address and find your collection day.
2. **New Dynamics 365 Portal**: Uses the newer [phxatyourservice.dynamics365portals.us/trashrecycling](https://phxatyourservice.dynamics365portals.us/trashrecycling/) service.

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/yourusername/MMM-PhoenixTrashDay.git
cd MMM-PhoenixTrashDay
npm install
```

## Configuration

Add the module to your `config/config.js` file:

```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "4027 W. Brill St, Phoenix, AZ"
  }
}
```

### Configuration Options

| Option             | Description                                                                                            | Default                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `address`          | **Required** - Street address to look up                                                               | `""`                                                                                |
| `updateInterval`   | How often to refresh the trash schedule in milliseconds                                                | `6 * 60 * 60 * 1000` (6 hours)                                                      |
| `debug`            | Show detailed error messages in the UI                                                                 | `false`                                                                             |
| `useDynamicsPortal`| Use the newer Dynamics 365 portal instead of ArcGIS                                                    | `false`                                                                             |
| `dynamicsPortalUrl`| URL for the Dynamics 365 portal                                                                        | `"https://phxatyourservice.dynamics365portals.us/trashrecycling/"`                  |
| `geocodeUrl`       | Esri geocoder endpoint (only used if `useDynamicsPortal` is `false`)                                   | `"https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"` |
| `trashLayerUrl`    | Phoenix curbside pickup layer (only used if `useDynamicsPortal` is `false`)                            | `"https://maps.phoenix.gov/pub/rest/services/public/GarbagePickUp/MapServer/2"`    |
| `showIcon`         | Whether to show icons for trash and recycling                                                          | `true`                                                                              |
| `showAddress`      | Whether to show the address information                                                                | `false`                                                                             |
| `showStaleDataNotice` | Show a notice when data might be stale                                                              | `true`                                                                              |
| `iconLibrary`      | Icon library to use ("fontawesome", "material", "ionicons", "feather", "custom")                       | `"fontawesome"`                                                                     |
| `iconSet`          | Icon set style to use ("default", "simple", "colorful", "outline", "custom")                           | `"default"`                                                                         |
| `iconColorStyle`   | Icon color style ("colored", "monochrome")                                                             | `"colored"`                                                                         |
| `customIconPath`   | Path to custom icons if iconLibrary = "custom"                                                          | `"/modules/MMM-PhoenixTrashDay/icons/"`                                             |
| `customIcons`      | Custom icon filenames object with properties `trash` and `recycle`                                     | `{trash: "trash.svg", recycle: "recycle.svg"}`                                      |

### Icon Configuration Examples

#### Using FontAwesome Icons with Default Style

```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "4027 W. Brill St, Phoenix, AZ",
    iconLibrary: "fontawesome", 
    iconSet: "default"
  }
}
```

#### Using Material Icons with Colorful Style

```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "4027 W. Brill St, Phoenix, AZ",
    iconLibrary: "material",
    iconSet: "colorful"
  }
}
```

#### Using Custom SVG Icons

```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "4027 W. Brill St, Phoenix, AZ",
    iconLibrary: "custom",
    customIconPath: "/modules/MMM-PhoenixTrashDay/icons/",
    customIcons: {
      trash: "colorful-trash.svg", 
      recycle: "colorful-recycle.svg"
    }
  }
}
```

#### Monochrome Icons

```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "4027 W. Brill St, Phoenix, AZ",
    iconLibrary: "fontawesome",
    iconSet: "outline",
    iconColorStyle: "monochrome"
  }
}
```

## Using the Dynamics 365 Portal

To switch to the new City of Phoenix Dynamics 365 Portal (recommended for future compatibility):

```javascript
{
  module: "MMM-PhoenixTrashDay",
  position: "top_left",
  config: {
    address: "4027 W. Brill St, Phoenix, AZ",
    useDynamicsPortal: false,
    debug: true
  }
}
```

## Troubleshooting

If you encounter issues with the module not displaying your trash day:

1. Enable debug mode to see detailed error messages:
   ```javascript
   config: {
     address: "4027 W. Brill St, Phoenix, AZ",
     debug: true
   }
   ```

2. Try using the other data source method (toggle `useDynamicsPortal` between `true` and `false`).

3. Verify that your address is within Phoenix city limits and receives Phoenix residential trash service.

## Icon Libraries

The module supports the following icon libraries:

- **FontAwesome**: Wide range of icons, most widely used
- **Material Icons**: Google's Material Design icons
- **Ionicons**: Clean, minimalist icon set
- **Feather**: Simple, elegant SVG icons
- **Custom**: Your own SVG icons placed in the module's `/icons/` directory

## Icon Sets

Four different icon set styles are available:

- **Default**: Standard icons (uses the selected icon library)
- **Simple**: Minimalist icon designs
- **Colorful**: Colorful, vibrant icons
- **Outline**: Outline-style icons
- **Custom**: Your own custom SVG icons

## License

MIT 