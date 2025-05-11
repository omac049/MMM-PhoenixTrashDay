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
      
      /** Use compact mode for a sleeker, smaller display */
      compactMode: true,
      
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
      const styles = ["vertical-layout.css", "MMM-PhoenixTrashDay.css"];
      
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
      const iconWrapper = document.createElement("div");
      iconWrapper.className = `${type}-icon`;
      
      // Use custom SVG icons if configured
      if (this.config.iconLibrary === "custom") {
        const img = document.createElement("img");
        img.className = `custom-${type}-icon`;
        img.src = this.config.customIconPath + this.config.customIcons[type];
        img.alt = type;
        iconWrapper.appendChild(img);
        return iconWrapper;
      }
      
      // Get the appropriate icon for the current library and style
      const iconSets = this.iconSets;
      const iconSet = this.config.iconSet in iconSets ? iconSets[this.config.iconSet] : iconSets.default;
      const iconType = type in iconSet ? iconSet[type] : {};
      const iconClass = this.config.iconLibrary in iconType ? iconType[this.config.iconLibrary] : iconType.fontawesome;
      
      // Handle different icon libraries
      switch (this.config.iconLibrary) {
        case "material":
          const materialIcon = document.createElement("span");
          materialIcon.className = "material-icons";
          materialIcon.textContent = iconClass;
          iconWrapper.appendChild(materialIcon);
          break;
          
        case "feather":
          // For Feather icons, we'll add a placeholder that will be replaced
          // with the actual SVG in notificationReceived when feather is loaded
          iconWrapper.dataset.featherIcon = iconClass;
          break;
          
        default: // FontAwesome and other libraries that use CSS classes
          const icon = document.createElement("i");
          icon.className = iconClass;
          iconWrapper.appendChild(icon);
      }
      
      return iconWrapper;
    },
  
    // ---------- DOM ----------
    getDom() {
      const wrapper = document.createElement("div");
      wrapper.className = "phoenix-trash-wrapper";
      
      // Add icon style class to the wrapper
      if (this.config.iconSet) {
        wrapper.classList.add(this.config.iconSet);
      }
      
      // Add monochrome class if configured
      if (this.config.iconColorStyle === "monochrome") {
        wrapper.classList.add("monochrome");
      }
      
      // Add compact mode class if configured
      if (this.config.compactMode) {
        wrapper.classList.add("compact");
      }
      
      const servicesContainer = document.createElement("div");
      servicesContainer.className = "trash-services-container";
      
      // Show error if there is one
      if (this.error) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "trash-error";
        
        const errorIcon = document.createElement("div");
        errorIcon.className = "trash-error-icon";
        errorIcon.innerHTML = "<i class='fa fa-exclamation-circle'></i>";
        
        const errorMessage = document.createElement("div");
        errorMessage.className = "trash-error-message";
        
        const errorType = document.createElement("div");
        errorType.className = "trash-error-type";
        errorType.textContent = this.translate(this.error.type || "errorUnknown");
        
        const errorDetails = document.createElement("div");
        errorDetails.className = "trash-error-details";
        errorDetails.textContent = this.config.debug ? this.error.message : "";
        
        errorMessage.appendChild(errorType);
        if (this.config.debug) {
          errorMessage.appendChild(errorDetails);
        }
        
        errorDiv.appendChild(errorIcon);
        errorDiv.appendChild(errorMessage);
        
        wrapper.appendChild(errorDiv);
        return wrapper;
      }
      
      // Show loading message if not loaded yet
      if (!this.loaded) {
        const loading = document.createElement("div");
        loading.textContent = "Loading...";
        loading.className = "dimmed light small";
        wrapper.appendChild(loading);
        return wrapper;
      }
      
      // Create trash pickup container
      if (this.nextPickup) {
        const trashContainer = this.createPickupContainer("trash", this.nextPickup);
        servicesContainer.appendChild(trashContainer);
      }
      
      // Create recycling pickup container
      if (this.nextRecyclePickup) {
        const recycleContainer = this.createPickupContainer("recycle", this.nextRecyclePickup);
        servicesContainer.appendChild(recycleContainer);
      }
      
      wrapper.appendChild(servicesContainer);
      
      // Show address if configured
      if (this.config.showAddress && this.address) {
        const addressDiv = document.createElement("div");
        addressDiv.className = "trash-address";
        addressDiv.textContent = this.address;
        wrapper.appendChild(addressDiv);
      }
      
      // Show stale data notice if needed
      if (this.config.showStaleDataNotice && this.isUsingCachedData) {
        const staleNotice = document.createElement("div");
        staleNotice.className = "trash-stale-notice";
        staleNotice.innerHTML = "<i class='fa fa-info-circle'></i> Using cached data due to service unavailability.";
        wrapper.appendChild(staleNotice);
      }
      
      // Show last updated timestamp
      if (this.lastUpdated) {
        const timestamp = document.createElement("div");
        timestamp.className = "trash-timestamp";
        timestamp.textContent = `${this.translate("lastUpdated")}: ${this.lastUpdated.format("lll")}`;
        wrapper.appendChild(timestamp);
      }
      
      // Add refresh button if enabled
      if (this.config.showRefreshButton) {
        const refreshButton = document.createElement("button");
        refreshButton.className = "trash-refresh-button";
        refreshButton.disabled = this.isRefreshing;
        refreshButton.textContent = this.isRefreshing ? this.translate("refreshing") : this.translate("refresh");
        refreshButton.addEventListener("click", () => this.manualRefresh());
        wrapper.appendChild(refreshButton);
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
          // Add moment object to the payload
          payload.trashSchedule.moment = moment(payload.trashSchedule.date, "ddd, MMM D");
          this.nextPickup = payload.trashSchedule;
        } else {
          // For backward compatibility
          if (payload.date) {
            payload.moment = moment(payload.date, "ddd, MMM D");
          }
          this.nextPickup = payload; 
        }
        
        // Handle recycling pickup schedule
        if (payload.recycleSchedule) {
          // Add moment object to the payload
          payload.recycleSchedule.moment = moment(payload.recycleSchedule.date, "ddd, MMM D");
          this.nextRecyclePickup = payload.recycleSchedule;
        }
        
        this.error = null;
        this.isRefreshing = false;
        this.lastUpdated = moment();
        this.updateDom();
      } else if (notification === "TRASHDAY_ERROR") {
        this.loaded = true;
        this.error = payload;
        this.isRefreshing = false;
        this.updateDom();
      }
    },

    createPickupContainer(type, pickupData) {
      // Check if pickupData is valid and has a moment property
      if (!pickupData || !pickupData.moment) {
        // Create a fallback container with an error or placeholder
        const container = document.createElement("div");
        container.className = `${type}-pickup-container`;
        
        // Create info section
        const info = document.createElement("div");
        info.className = `${type}-info`;
        
        // Create service label
        const label = document.createElement("div");
        label.className = `${type}-service-label`;
        label.textContent = this.translate(type);
        info.appendChild(label);
        
        // Create error message
        const errorMsg = document.createElement("div");
        errorMsg.className = `${type}-error`;
        errorMsg.textContent = "No date available";
        info.appendChild(errorMsg);
        
        container.appendChild(info);
        return container;
      }
      
      const container = document.createElement("div");
      container.className = `${type}-pickup-container`;
      
      // Create icon
      if (this.config.showIcon) {
        const icon = this.createIcon(type);
        container.appendChild(icon);
      }
      
      // Create info section
      const info = document.createElement("div");
      info.className = `${type}-info`;
      
      // Create service label
      const label = document.createElement("div");
      label.className = `${type}-service-label`;
      label.textContent = this.translate(type);
      info.appendChild(label);
      
      // Create day/date
      const dayDate = document.createElement("div");
      dayDate.className = `${type}-day-date`;
      
      try {
        // Format day text (today, tomorrow, or day of week)
        const daysUntil = pickupData.moment.diff(moment().startOf('day'), 'days');
        let dayText;
        
        if (daysUntil === 0) {
          dayText = this.translate("today");
        } else if (daysUntil === 1) {
          dayText = this.translate("tomorrow");
        } else {
          dayText = pickupData.moment.format('dddd');
        }
        
        const day = document.createElement("span");
        day.className = `${type}-day`;
        day.textContent = dayText;
        dayDate.appendChild(day);
        
        // Add space between day and date
        dayDate.appendChild(document.createTextNode(" "));
        
        // Add date
        const date = document.createElement("span");
        date.className = `${type}-date`;
        date.textContent = pickupData.moment.format('MMM D');
        dayDate.appendChild(date);
      } catch (e) {
        // Fallback if moment operations fail
        console.error(`[MMM-PhoenixTrashDay] Error formatting date: ${e.message}`);
        
        // Use raw date if available
        if (pickupData.date) {
          const fallbackDate = document.createElement("span");
          fallbackDate.className = `${type}-fallback-date`;
          fallbackDate.textContent = pickupData.date;
          dayDate.appendChild(fallbackDate);
        } else {
          const errorMsg = document.createElement("span");
          errorMsg.className = `${type}-error`;
          errorMsg.textContent = "Date error";
          dayDate.appendChild(errorMsg);
        }
      }
      
      info.appendChild(dayDate);
      container.appendChild(info);
      
      return container;
    }
  });