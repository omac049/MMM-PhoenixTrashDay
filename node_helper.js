/**
 * Node helper for MMM-PhoenixTrashDay
 *
 * Can use either the legacy ArcGIS method or the new Dynamics 365 portal.
 */
const NodeHelper = require("node_helper");
const axios = require("axios");
const qs = require("querystring");

module.exports = NodeHelper.create({
  // Add cache storage
  cache: {},
  retryAttempts: {},
  
  start() {
    console.log("[MMM-PhoenixTrashDay] Node helper started");
  },

  socketNotificationReceived(notification, payload) {
    if (notification !== "TRASHDAY_FETCH") return;

    const { address, geocodeUrl, trashLayerUrl, recycleLayerUrl, useDynamicsPortal, dynamicsPortalUrl } = payload.config;
    
    // Reset retry attempts if this is a manual refresh
    if (payload.isManualRefresh) {
      const cacheKey = `${address}|${useDynamicsPortal ? 'dynamics' : 'arcgis'}`;
      this.retryAttempts[cacheKey] = 0;
    }

    this.fetchSchedule(address, geocodeUrl, trashLayerUrl, recycleLayerUrl, useDynamicsPortal, dynamicsPortalUrl)
      .then((data) => this.sendSocketNotification("TRASHDAY_RESULT", data))
      .catch((err) => {
        console.error("[MMM-PhoenixTrashDay]", err.message);
        
        // Format a more detailed error message
        let errorMessage = err.message;
        let errorType = "unknown";
        
        if (err.message.includes("No address configured")) {
          errorType = "config";
          errorMessage = "No address configured. Please add an address in the module config.";
        } else if (err.message.includes("Address not found")) {
          errorType = "geocoding";
          errorMessage = "Address could not be found. Please verify the address is correct.";
        } else if (err.message.includes("Pickup zone not found")) {
          errorType = "service";
          errorMessage = "No trash pickup zone found for this address. The address may be outside Phoenix service area.";
        } else if (err.message.includes("Day field not found")) {
          errorType = "data";
          errorMessage = "Pickup day information is missing in the response data.";
        } else if (err.message.includes("ENOTFOUND") || err.message.includes("ETIMEDOUT") || err.message.includes("ECONNREFUSED")) {
          errorType = "network";
          errorMessage = "Network error. Unable to connect to Phoenix services.";
        } else if (err.response && err.response.status) {
          errorType = "http";
          errorMessage = `Server error (${err.response.status}): ${err.message}`;
        }
        
        this.sendSocketNotification("TRASHDAY_ERROR", {
          message: errorMessage,
          type: errorType,
          raw: err.message
        });
      });
  },

  async fetchSchedule(address, geocodeUrl, trashLayerUrl, recycleLayerUrl, useDynamicsPortal = false, dynamicsPortalUrl = "https://phxatyourservice.dynamics365portals.us/trashrecycling/") {
    if (!address) {
      throw new Error("No address configured");
    }
    
    // Check cache first
    const cacheKey = `${address}|${useDynamicsPortal ? 'dynamics' : 'arcgis'}`;
    
    // If we have a valid cache entry, use it
    if (this.cache[cacheKey] && this.cache[cacheKey].expiry > Date.now()) {
      console.log("[MMM-PhoenixTrashDay] Using cached data");
      return this.cache[cacheKey].data;
    }
    
    let result;
    
    // Initialize retry attempts if not already set
    if (this.retryAttempts[cacheKey] === undefined) {
      this.retryAttempts[cacheKey] = 0;
    }
    
    try {
      // If using new Dynamics 365 Portal
      if (useDynamicsPortal) {
        result = await this.fetchScheduleFromDynamics(address, dynamicsPortalUrl);
      } else {
        // Otherwise use legacy ArcGIS approach to get both trash and recycling schedules
        result = await this.fetchScheduleFromArcGIS(address, geocodeUrl, trashLayerUrl, recycleLayerUrl);
      }
      
      // Success - reset retry counter
      this.retryAttempts[cacheKey] = 0;
      
      // Cache the result for 24 hours
      this.cache[cacheKey] = {
        data: result,
        expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      };
      
      return result;
    } catch (error) {
      // Check if error is retryable (network errors, timeouts, or 5xx errors)
      const isRetryable = 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNABORTED' ||
        (error.response && error.response.status >= 500 && error.response.status < 600);
      
      if (isRetryable && this.retryAttempts[cacheKey] < 3) {
        // Increment retry counter
        this.retryAttempts[cacheKey]++;
        
        // Calculate backoff time: 2^retry * 1000ms (1s, 2s, 4s)
        const backoffMs = Math.pow(2, this.retryAttempts[cacheKey]) * 1000;
        console.log(`[MMM-PhoenixTrashDay] Retry ${this.retryAttempts[cacheKey]} after ${backoffMs}ms`);
        
        // Wait for backoff period
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Retry the request
        return this.fetchSchedule(address, geocodeUrl, trashLayerUrl, recycleLayerUrl, useDynamicsPortal, dynamicsPortalUrl);
      }
      
      // If we reach here, either the error is not retryable or we've exhausted retries
      console.error(`[MMM-PhoenixTrashDay] Failed after ${this.retryAttempts[cacheKey]} retries:`, error.message);
      
      // Use cached data as fallback if available
      if (this.cache[cacheKey]) {
        console.log("[MMM-PhoenixTrashDay] Using stale cached data as fallback");
        const staleData = { 
          ...this.cache[cacheKey].data, 
          isStale: true,
          lastUpdated: new Date(this.cache[cacheKey].expiry - 24 * 60 * 60 * 1000).toISOString(),
          failureReason: error.message
        };
        return staleData;
      }
      
      // No cached data available, propagate the error
      throw error;
    }
  },
  
  async fetchScheduleFromDynamics(address, dynamicsPortalUrl) {
    try {
      console.log("[MMM-PhoenixTrashDay] Using Dynamics 365 Portal API");
      
      // Step 1: Get session and form data
      const initialResponse = await axios.get(dynamicsPortalUrl);
      
      // This would likely need more code to parse out any session tokens, form data, etc.
      // The actual implementation would depend on the specific requirements of the portal
      
      // Step 2: Submit the address lookup form
      // Example - this will need to be adjusted based on actual API examination
      const formData = {
        address: address,
        // Add any other required fields here
      };
      
      const lookupResponse = await axios.post(
        `${dynamicsPortalUrl}api/lookup`, 
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            // May need session/CSRF tokens here
          }
        }
      );
      
      // Parse the response - actual parsing depends on the API response format
      if (!lookupResponse.data || !lookupResponse.data.pickupDay) {
        throw new Error("Could not determine trash pickup day from Dynamics portal");
      }
      
      // Extract pickup day - adjust based on actual API response
      const rawDay = lookupResponse.data.pickupDay;
      
      // Format day similar to the ArcGIS implementation
      const dayUpper = rawDay.toUpperCase();
      const week = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ];
      let delta = week.indexOf(dayUpper) - new Date().getDay();
      if (delta <= 0) delta += 7;
      const next = new Date(Date.now() + delta * 864e5);

      return {
        trashSchedule: {
          day: dayUpper.charAt(0) + dayUpper.slice(1).toLowerCase(),
          date: next.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        }
      };
    } catch (error) {
      console.error("[MMM-PhoenixTrashDay] Dynamics portal error:", error.message);
      throw new Error(`Dynamics portal error: ${error.message}`);
    }
  },
  
  async fetchScheduleFromArcGIS(address, geocodeUrl, trashLayerUrl, recycleLayerUrl) {
    try {
      // 1. geocode
      const geo = await axios.get(
        `${geocodeUrl}?${qs.stringify({
          f: "json",
          maxLocations: 1,
          outFields: "Match_addr,Addr_type",
          singleLine: address,
        })}`,
      );
      const cand = geo.data.candidates?.[0];
      if (!cand) throw new Error("Address not found");
      const { x: lon, y: lat } = cand.location;

      // 2. spatial query to layer 2 (trash)
      const trashQry = await axios.get(
        `${trashLayerUrl}/query?${qs.stringify({
          f: "json",
          geometryType: "esriGeometryPoint",
          geometry: `${lon},${lat}`,
          inSR: 4326,
          spatialRel: "esriSpatialRelIntersects",
          outFields: "*",
          returnGeometry: false,
        })}`,
      );
      
      console.log("[MMM-PhoenixTrashDay] Trash API response:", JSON.stringify(trashQry.data));
      
      const trashFeat = trashQry.data.features?.[0];
      if (!trashFeat) throw new Error("Trash pickup zone not found");

      // 3. Extract trash pickup weekday
      const trashRawDay =
        trashFeat.attributes.PICKUPDAY ||
        trashFeat.attributes.DAY ||
        trashFeat.attributes.WEEKDAY ||
        trashFeat.attributes.DOC;
        
      if (!trashRawDay) {
        console.error("[MMM-PhoenixTrashDay] Available trash fields:", JSON.stringify(trashFeat.attributes));
        throw new Error("Day field not found in trash attributes");
      }

      // 4. Spatial query to layer 1 (recycling)
      let recycleFeat = null;
      let recycleData = null;
      if (recycleLayerUrl) {
        try {
          const recycleQry = await axios.get(
            `${recycleLayerUrl}/query?${qs.stringify({
              f: "json",
              geometryType: "esriGeometryPoint",
              geometry: `${lon},${lat}`,
              inSR: 4326,
              spatialRel: "esriSpatialRelIntersects",
              outFields: "*",
              returnGeometry: false,
            })}`,
          );
          
          console.log("[MMM-PhoenixTrashDay] Recycle API response:", JSON.stringify(recycleQry.data));
          
          recycleFeat = recycleQry.data.features?.[0];
          if (recycleFeat) {
            // 5. Extract recycle pickup weekday
            const recycleRawDay =
              recycleFeat.attributes.PICKUPDAY ||
              recycleFeat.attributes.DAY ||
              recycleFeat.attributes.WEEKDAY ||
              recycleFeat.attributes.DOC;
              
            if (recycleRawDay) {
              // Process recycling day
              const recycleDayUpper = recycleRawDay.toUpperCase();
              const week = [
                "SUNDAY",
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
              ];
              let recycleDelta = week.indexOf(recycleDayUpper) - new Date().getDay();
              if (recycleDelta <= 0) recycleDelta += 7;
              const recycleNext = new Date(Date.now() + recycleDelta * 864e5);
              
              recycleData = {
                day: recycleDayUpper.charAt(0) + recycleDayUpper.slice(1).toLowerCase(),
                date: recycleNext.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }),
                coordinates: { lon, lat },
                dataSource: "ArcGIS",
              };
            }
          }
        } catch (recycleError) {
          console.error("[MMM-PhoenixTrashDay] Error fetching recycling data:", recycleError.message);
          // We'll continue with just the trash data even if recycling fails
        }
      }

      // Process trash day
      const trashDayUpper = trashRawDay.toUpperCase();
      const week = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ];
      let trashDelta = week.indexOf(trashDayUpper) - new Date().getDay();
      if (trashDelta <= 0) trashDelta += 7;
      const trashNext = new Date(Date.now() + trashDelta * 864e5);

      // Build a comprehensive result object
      const result = {
        trashSchedule: {
          day: trashDayUpper.charAt(0) + trashDayUpper.slice(1).toLowerCase(),
          date: trashNext.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          address: cand.address || address,
          addressType: cand.attributes?.Addr_type || "Unknown",
          coordinates: { lon, lat },
          dataSource: "ArcGIS",
          dataTimestamp: new Date().toISOString()
        }
      };
      
      // Add recycling data if available
      if (recycleData) {
        result.recycleSchedule = {
          ...recycleData,
          dataTimestamp: new Date().toISOString()
        };
      }

      return result;
    } catch (error) {
      console.error("[MMM-PhoenixTrashDay] ArcGIS error:", error.message);
      
      // If we have a previous cached result, return it with an indicator that it's stale
      const cacheKey = `${address}|arcgis`;
      if (this.cache[cacheKey]) {
        const staleData = { ...this.cache[cacheKey].data, isStale: true };
        return staleData;
      }
      
      throw error;
    }
  },
});