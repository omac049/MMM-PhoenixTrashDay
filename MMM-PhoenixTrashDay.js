/*
 * MagicMirror² Module: MMM-PhoenixTrashDay
 *
 * Shows the next curbside trash / recycle pickup day for a given Phoenix, AZ address.
 * Based on Dennis-Rosenbaum/MMM-Template.
 *
 * Author: OpenAI Nova
 * License: MIT
 */
/* global Module, Log */

Module.register("MMM-PhoenixTrashDay", {
    // ---------- defaults ----------
    defaults: {
      /** Street address to look up (example). */
      address: "",
  
      /** Refresh schedule (ms) – 6 h. */
      updateInterval: 6 * 60 * 60 * 1000,
  
      /** Esri geocoder endpoint. */
      geocodeUrl:
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates",
  
      /** Phoenix curbside pickup layer. */
      trashLayerUrl:
        "https://maps.phoenix.gov/pub/rest/services/public/GarbagePickUp/MapServer/2",
        
      /** Phoenix recycle pickup layer. */
      recycleLayerUrl:
        "https://maps.phoenix.gov/pub/rest/services/public/GarbagePickUp/MapServer/1",
        
      /** Enable debug mode for troubleshooting */
      debug: false,

      /** Whether to use the new Dynamics 365 portal instead of ArcGIS */
      useDynamicsPortal: false,

      /** URL for the Dynamics 365 portal */
      dynamicsPortalUrl: "https://phxatyourservice.dynamics365portals.us/trashrecycling/",
      
      /** Show address information */
      showAddress: false,
      
      /** Show a notice when data might be stale (fallback to cached data) */
      showStaleDataNotice: true,
      
      /** Show Phoenix PW icon */
      showIcon: true,
      
      /** Show refresh button - disabled for Magic Mirror displays */
      showRefreshButton: false,
      
      /** Maximum retries for failed requests */
      maxRetries: 3,
      
      /** Icon library to use
       * Options: 
       * - "fontawesome" (default)
       * - "material" (Google Material Icons)
       * - "ionicons" 
       * - "feather"
       * - "custom" (requires customIconPath)
       */
      iconLibrary: "fontawesome",
      
      /** Path to custom icons if iconLibrary = "custom" */
      customIconPath: "/modules/MMM-PhoenixTrashDay/icons/",
      
      /** Custom icon filenames */
      customIcons: {
        trash: "trash.svg",
        recycle: "recycle.svg"
      },

      /** Icon set to use
       * Options:
       * - "default" (uses iconLibrary setting)
       * - "simple" (minimalist icons)
       * - "colorful" (colorful icons)
       * - "outline" (outline style icons)
       * - "custom" (uses customIconPath)
       */
      iconSet: "default",

      /** Icon color style 
       * Options:
       * - "colored" (full color icons)
       * - "monochrome" (single color icons, uses CSS for coloring)
       */
      iconColorStyle: "colored",

      unitText: "mi",
      maxDistance: 0.5,
      minTileX: 2120, // Min tile for Phoenix, AZ
      maxTileX: 2130, // Max tile for Phoenix, AZ
      minTileY: 1358, // Min tile for Phoenix, AZ
      maxTileY: 1368, // Max tile for Phoenix, AZ
      translations: Object.assign({
        en: {
          address: "Address",
          trash: "Trash",
          recycling: "Recycling",
          pickupOn: "Pickup on",
          TRASH: "Trash",
          RECYCLE: "Recycling",
          today: "today",
          tomorrow: "tomorrow"
        },
        es: {
          address: "Dirección",
          trash: "Basura",
          recycling: "Reciclaje",
          pickupOn: "Recogida el",
          TRASH: "Basura",
          RECYCLE: "Reciclaje",
          today: "hoy",
          tomorrow: "mañana"
        }
      })
    },
  
    nextPickup: null,
    nextRecyclePickup: null,
    loaded: false,
    error: null,
    isRefreshing: false,
    lastUpdated: null,
    
    // Store icon sets for different styles
    iconSets: {
      default: {
        trash: {
          fontawesome: "fa fa-trash",
          material: "delete",
          ionicons: "icon ion-md-trash",
          feather: "trash-2"
        },
        recycle: {
          fontawesome: "fa fa-recycle",
          material: "recycling",
          ionicons: "icon ion-md-refresh",
          feather: "refresh-cw"
        }
      },
      simple: {
        trash: {
          fontawesome: "fa fa-trash-alt",
          material: "delete_outline",
          ionicons: "icon ion-md-trash",
          feather: "trash"
        },
        recycle: {
          fontawesome: "fa fa-sync",
          material: "autorenew",
          ionicons: "icon ion-md-sync",
          feather: "refresh-cw"
        }
      },
      colorful: {
        trash: {
          fontawesome: "fa fa-dumpster",
          material: "delete_forever",
          ionicons: "icon ion-md-trash",
          feather: "trash-2"
        },
        recycle: {
          fontawesome: "fa fa-recycle",
          material: "loop",
          ionicons: "icon ion-md-refresh",
          feather: "refresh-cw"
        }
      },
      outline: {
        trash: {
          fontawesome: "far fa-trash-alt",
          material: "delete_outline",
          ionicons: "icon ion-ios-trash",
          feather: "trash"
        },
        recycle: {
          fontawesome: "far fa-recycle",
          material: "autorenew",
          ionicons: "icon ion-ios-refresh",
          feather: "refresh-cw"
        }
      }
    },
    
    getScripts: function() {
      const scripts = [];
      
      // Add any required script for specific icon libraries
      if (this.config.iconLibrary === "feather") {
        scripts.push("https://unpkg.com/feather-icons");
      }
      
      return scripts;
    },
  
    getStyles: function() {
      const styles = ["MMM-PhoenixTrashDay.css"];
      
      // Add icon library CSS based on configuration
      switch (this.config.iconLibrary) {
        case "fontawesome":
          styles.push("font-awesome.css");
          break;
        case "material":
          styles.push("https://fonts.googleapis.com/icon?family=Material+Icons");
          break;
        case "ionicons":
          styles.push("https://unpkg.com/ionicons@4.5.5/dist/css/ionicons.min.css");
          break;
        case "custom":
          // No additional CSS needed for custom SVG icons
          break;
        default:
          styles.push("font-awesome.css");
      }
      
      return styles;
    },
  
    // Define translations - specify files to load rather than inline objects
    getTranslations: function() {
      return false; // Return false to use the inline translations in defaults
    },
  
    // Use the translator properly with a fallback mechanism
    translate: function(key) {
      if (this.translator) {
        return this.translator.translate(key) || key;
      }
      
      // Fallback when translator is not yet available
      const translations = {
        refresh: "Refresh",
        refreshing: "Refreshing...",
        lastUpdated: "Last updated",
        errorConfig: "Configuration error",
        errorGeocoding: "Geocoding error",
        errorService: "Service error",
        errorData: "Data error",
        errorNetwork: "Network error", 
        errorHttp: "HTTP error",
        errorUnknown: "Unknown error",
        trash: "Trash",
        recycle: "Recycling"
      };
      return translations[key] || key;
    },
  
    // ---------- life-cycle ----------
    start() {
      Log.info(`Starting module: ${this.name}`);
      this.getSchedule();
      this.scheduleUpdate();
    },
  
    // Create icon based on selected library and icon set
    createIcon(type) {
      const iconContainer = document.createElement("div");
      iconContainer.className = type === "trash" ? "trash-icon" : "recycle-icon";
      
      // Add custom class if specified color style is monochrome
      if (this.config.iconColorStyle === "monochrome") {
        iconContainer.classList.add("monochrome");
      }
      
      // Determine which icon set to use
      let iconSetName = this.config.iconSet;
      if (iconSetName === "default" || !this.iconSets[iconSetName]) {
        iconSetName = "default";
      }
      
      // For custom icon set, create SVG
      if (this.config.iconSet === "custom" || this.config.iconLibrary === "custom") {
        const customIcon = document.createElement("img");
        
        // Determine the correct icon filename based on iconSet
        let iconFilename;
        if (type === "trash") {
          iconFilename = this.config.customIcons.trash;
        } else {
          iconFilename = this.config.customIcons.recycle;
        }
        
        // If iconSet is specified but not "custom", look for that file variant first
        if (this.config.iconSet !== "custom" && this.config.iconSet !== "default") {
          // Check if there's a specific file for the selected icon set (e.g., simple-trash.svg)
          const iconSetFile = `${this.config.iconSet}-${type}.svg`;
          
          // Use the specific icon set file if available, otherwise fall back to the custom icon
          customIcon.src = this.config.customIconPath + iconSetFile;
          
          // Add error handler to fall back to default custom icon if the specific one doesn't exist
          customIcon.onerror = () => {
            customIcon.src = this.config.customIconPath + iconFilename;
          };
        } else {
          // Use the specified custom icon directly
          customIcon.src = this.config.customIconPath + iconFilename;
        }
        
        customIcon.className = type === "trash" ? "custom-trash-icon" : "custom-recycle-icon";
        iconContainer.appendChild(customIcon);
        return iconContainer;
      }
      
      // Get the icon from the selected set and library
      const iconSet = this.iconSets[iconSetName];
      const iconDef = iconSet ? iconSet[type] : this.iconSets.default[type];
      
      switch(this.config.iconLibrary) {
        case "fontawesome":
          const faIcon = document.createElement("i");
          faIcon.className = iconDef.fontawesome || this.iconSets.default[type].fontawesome;
          iconContainer.appendChild(faIcon);
          break;
          
        case "material":
          const materialIcon = document.createElement("i");
          materialIcon.className = "material-icons";
          materialIcon.textContent = iconDef.material || this.iconSets.default[type].material;
          iconContainer.appendChild(materialIcon);
          break;
          
        case "ionicons":
          const ionIcon = document.createElement("i");
          ionIcon.className = iconDef.ionicons || this.iconSets.default[type].ionicons;
          iconContainer.appendChild(ionIcon);
          break;
          
        case "feather":
          const featherIcon = document.createElement("i");
          featherIcon.setAttribute("data-feather", iconDef.feather || this.iconSets.default[type].feather);
          iconContainer.appendChild(featherIcon);
          // Feather icons need to be replaced after the DOM is loaded
          setTimeout(() => {
            if (typeof feather !== 'undefined') {
              feather.replace();
            }
          }, 1000);
          break;
          
        default:
          // Default to font awesome
          const defaultIcon = document.createElement("i");
          defaultIcon.className = this.iconSets.default[type].fontawesome;
          iconContainer.appendChild(defaultIcon);
      }
      
      return iconContainer;
    },
  
    // ---------- DOM ----------
    getDom() {
      const wrapper = document.createElement("div");
      wrapper.className = "phoenix-trash-wrapper";
      
      // Add icon set class to wrapper
      if (this.config.iconSet && this.config.iconSet !== "default" && this.config.iconSet !== "custom") {
        wrapper.classList.add(this.config.iconSet);
      }
  
      if (!this.loaded) {
        wrapper.innerHTML = "Loading trash schedule…";
        return wrapper;
      }
      
      if (this.error) {
        const errorWrapper = document.createElement("div");
        errorWrapper.className = "trash-error";
        
        // Show error icon based on error type
        const errorIcon = document.createElement("i");
        errorIcon.className = "fa fa-exclamation-triangle trash-error-icon";
        errorWrapper.appendChild(errorIcon);
        
        // Error message container
        const errorMsg = document.createElement("div");
        errorMsg.className = "trash-error-message";
        
        // Error type heading
        if (this.error.type) {
          const errorType = document.createElement("div");
          errorType.className = "trash-error-type";
          errorType.textContent = this.translate(`error${this.error.type.charAt(0).toUpperCase() + this.error.type.slice(1)}`);
          errorMsg.appendChild(errorType);
        }
        
        // Error details
        const errorDetails = document.createElement("div");
        errorDetails.className = "trash-error-details";
        errorDetails.textContent = this.config.debug ? this.error.raw : this.error.message;
        errorMsg.appendChild(errorDetails);
        
        errorWrapper.appendChild(errorMsg);
        
        wrapper.appendChild(errorWrapper);
        return wrapper;
      }
      
      if (!this.nextPickup) {
        wrapper.innerHTML = "No schedule found.";
        return wrapper;
      }
      
      // Create a container for both trash and recycling info
      const servicesContainer = document.createElement("div");
      servicesContainer.className = "trash-services-container";
      
      // Add trash pickup info
      const trashContainer = document.createElement("div");
      trashContainer.className = "trash-pickup-container";
      
      // Add icon for trash
      if (this.config.showIcon) {
        trashContainer.appendChild(this.createIcon("trash"));
      }
      
      // Trash info
      const trashInfoContainer = document.createElement("div");
      trashInfoContainer.className = "trash-info";
      
      // Trash label
      const trashLabel = document.createElement("div");
      trashLabel.className = "trash-service-label";
      trashLabel.textContent = this.translate("trash");
      trashInfoContainer.appendChild(trashLabel);
      
      // Add day and date for trash
      const trashDayDateContainer = document.createElement("div");
      trashDayDateContainer.className = "trash-day-date";
      
      const trashDaySpan = document.createElement("span");
      trashDaySpan.className = "trash-day";
      trashDaySpan.innerText = this.nextPickup.day;

      const trashDateSpan = document.createElement("span");
      trashDateSpan.className = "trash-date";
      trashDateSpan.innerText = this.nextPickup.date;
      
      trashDayDateContainer.appendChild(trashDaySpan);
      trashDayDateContainer.appendChild(document.createTextNode(" – "));
      trashDayDateContainer.appendChild(trashDateSpan);
      
      trashInfoContainer.appendChild(trashDayDateContainer);
      trashContainer.appendChild(trashInfoContainer);
      servicesContainer.appendChild(trashContainer);
      
      // Add recycling pickup info if available
      if (this.nextRecyclePickup) {
        const recycleContainer = document.createElement("div");
        recycleContainer.className = "recycle-pickup-container";
        
        // Add icon for recycling
        if (this.config.showIcon) {
          recycleContainer.appendChild(this.createIcon("recycle"));
        }
        
        // Recycling info
        const recycleInfoContainer = document.createElement("div");
        recycleInfoContainer.className = "recycle-info";
        
        // Recycling label
        const recycleLabel = document.createElement("div");
        recycleLabel.className = "recycle-service-label";
        recycleLabel.textContent = this.translate("recycle");
        recycleInfoContainer.appendChild(recycleLabel);
        
        // Add day and date for recycling
        const recycleDayDateContainer = document.createElement("div");
        recycleDayDateContainer.className = "recycle-day-date";
        
        const recycleDaySpan = document.createElement("span");
        recycleDaySpan.className = "recycle-day";
        recycleDaySpan.innerText = this.nextRecyclePickup.day;

        const recycleDateSpan = document.createElement("span");
        recycleDateSpan.className = "recycle-date";
        recycleDateSpan.innerText = this.nextRecyclePickup.date;
        
        recycleDayDateContainer.appendChild(recycleDaySpan);
        recycleDayDateContainer.appendChild(document.createTextNode(" – "));
        recycleDayDateContainer.appendChild(recycleDateSpan);
        
        recycleInfoContainer.appendChild(recycleDayDateContainer);
        recycleContainer.appendChild(recycleInfoContainer);
        servicesContainer.appendChild(recycleContainer);
      }
      
      wrapper.appendChild(servicesContainer);
      
      // Add address info if configured
      if (this.config.showAddress && this.nextPickup.address) {
        const addressContainer = document.createElement("div");
        addressContainer.className = "trash-address";
        addressContainer.textContent = this.nextPickup.address;
        wrapper.appendChild(addressContainer);
      }
      
      // Last updated timestamp
      if (this.nextPickup.dataTimestamp || this.nextPickup.lastUpdated) {
        const timestampContainer = document.createElement("div");
        timestampContainer.className = "trash-timestamp";
        
        const timestamp = this.nextPickup.dataTimestamp || this.nextPickup.lastUpdated;
        const date = new Date(timestamp);
        
        timestampContainer.textContent = `${this.translate("lastUpdated")}: ${date.toLocaleDateString()}`;
        wrapper.appendChild(timestampContainer);
      }
      
      // Add stale data notice if data is stale and notice is enabled
      if (this.nextPickup.isStale && this.config.showStaleDataNotice) {
        const staleNotice = document.createElement("div");
        staleNotice.className = "trash-stale-notice";
        
        // Show warning icon
        const warningIcon = document.createElement("i");
        warningIcon.className = "fa fa-exclamation-circle";
        staleNotice.appendChild(warningIcon);
        
        staleNotice.appendChild(document.createTextNode(" Using cached data - could not refresh"));
        
        wrapper.appendChild(staleNotice);
      }
      
      return wrapper;
    },
  
    // ---------- data flow ----------
    getSchedule() {
      this.sendSocketNotification("TRASHDAY_FETCH", { config: this.config });
    },
    
    // Manual refresh with retry reset
    manualRefresh() {
      this.isRefreshing = true;
      this.updateDom();
      
      this.sendSocketNotification("TRASHDAY_FETCH", { 
        config: this.config,
        isManualRefresh: true
      });
      
      // Reset refresh state after a timeout
      setTimeout(() => {
        this.isRefreshing = false;
        this.updateDom();
      }, 10000); // 10 seconds timeout
    },
  
    scheduleUpdate() {
      setInterval(() => this.getSchedule(), this.config.updateInterval);
    },
  
    socketNotificationReceived(notification, payload) {
      if (notification === "TRASHDAY_RESULT") {
        this.loaded = true;
        
        // Handle trash pickup schedule
        if (payload.trashSchedule) {
          this.nextPickup = payload.trashSchedule;
        } else {
          this.nextPickup = payload; // For backward compatibility
        }
        
        // Handle recycling pickup schedule
        if (payload.recycleSchedule) {
          this.nextRecyclePickup = payload.recycleSchedule;
        }
        
        this.error = null;
        this.isRefreshing = false;
        this.lastUpdated = new Date();
        this.updateDom();
      } else if (notification === "TRASHDAY_ERROR") {
        this.loaded = true;
        this.error = payload;
        this.isRefreshing = false;
        this.updateDom();
      }
    },

    createPickupInfo: function(type, date) {
      const pickupWrapper = document.createElement("div");
      pickupWrapper.className = "pickup " + type.toLowerCase();

      // Create icon based on selected library
      let icon;
      
      switch (this.config.iconLibrary) {
        case "fontawesome":
          icon = document.createElement("i");
          if (type === "TRASH") {
            icon.className = "fa fa-trash";
          } else if (type === "RECYCLE") {
            icon.className = "fa fa-recycle";
          }
          break;

        case "material":
          icon = document.createElement("i");
          icon.className = "material-icons";
          if (type === "TRASH") {
            icon.textContent = "delete";
          } else if (type === "RECYCLE") {
            icon.textContent = "recycling";
          }
          break;

        case "custom":
          icon = document.createElement("div");
          icon.className = "custom-icon";
          
          // Create SVG
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("width", "24px");
          svg.setAttribute("height", "24px");
          
          // Load SVG content from file
          const iconPath = this.config.customIconPath + (type === "TRASH" ? "trash.svg" : "recycle.svg");
          
          // Use fetch to load the SVG content
          fetch(iconPath)
            .then(response => response.text())
            .then(svgContent => {
              // Extract the SVG content
              const parser = new DOMParser();
              const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
              const svgElement = svgDoc.documentElement;
              
              // Replace the placeholder with the actual SVG
              while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
              }
              
              // Import and append all child nodes from the loaded SVG
              for (let i = 0; i < svgElement.childNodes.length; i++) {
                const importedNode = document.importNode(svgElement.childNodes[i], true);
                svg.appendChild(importedNode);
              }
            })
            .catch(error => {
              console.error("Error loading SVG:", error);
            });
          
          icon.appendChild(svg);
          break;

        default:
          icon = document.createElement("i");
          if (type === "TRASH") {
            icon.className = "fa fa-trash";
          } else if (type === "RECYCLE") {
            icon.className = "fa fa-recycle";
          }
      }

      pickupWrapper.appendChild(icon);

      const titleElt = document.createElement("div");
      titleElt.className = "title";
      titleElt.innerHTML = this.translate(type);
      pickupWrapper.appendChild(titleElt);

      const dateElt = document.createElement("div");
      dateElt.className = "date";
      
      if (date) {
        const formattedDate = new Date(date);
        const day = formattedDate.toLocaleDateString(this.config.language, { weekday: 'long' });
        const monthDay = formattedDate.toLocaleDateString(this.config.language, { month: 'short', day: 'numeric' });
        
        dateElt.textContent = `${day}, ${monthDay}`;
      } else {
        dateElt.textContent = this.translate("notScheduled");
      }
      
      pickupWrapper.appendChild(dateElt);
      
      return pickupWrapper;
    }
  });