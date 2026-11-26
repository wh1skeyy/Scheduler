/**
 * @typedef {Object} BookingTypeConfig
 * @property {string} label - Display label for the booking type
 * @property {number[]|number|null} fixed - Fixed duration(s) in minutes, or null for flexible
 * @property {number} min - Minimum duration in minutes
 * @property {number} max - Maximum duration in minutes
 * @property {boolean} approval - Whether booking requires approval
 * @property {boolean|"code"|"password"} auth - Authentication requirement
 */

/**
 * @typedef {Object} AppConfig
 * @property {Object.<string, BookingTypeConfig>} types - Booking type configurations
 * @property {number} step - Time step in minutes
 * @property {number} leadHours - Lead time in hours
 * @property {number} horizonDays - Booking horizon in days
 */

/**
 * @typedef {Object} TimeBlock
 * @property {number} s - Start time in minutes from midnight
 * @property {number} e - End time in minutes from midnight
 * @property {string} kind - Block type label (e.g., "WORK", "LESSON")
 * @property {boolean} pending - Whether the block is pending approval
 */

/**
 * @typedef {Object} DaySchedule
 * @property {string} date - Date key in YYYY-MM-DD format
 * @property {TimeBlock[]} blocks - Array of time blocks
 */

/**
 * @typedef {Object} WeekSchedule
 * @property {DaySchedule[]} days - Seven days starting from Monday
 */

/**
 * @typedef {Object} BookingAuth
 * @property {string} value - Credential value (code or password)
 * @property {boolean} verified - Whether credential has been verified
 * @property {string} name - Name from verification (for lesson type)
 */

/**
 * @typedef {Object} BookingDetails
 * @property {string} name - User's name
 * @property {string} email - User's email
 * @property {string} note - Optional note
 * @property {string} topic - Topic for work bookings
 * @property {string} reason - Reason for priority bookings
 * @property {string} hp - Honeypot field
 */

/**
 * @typedef {Object} BookingState
 * @property {string} type - Booking type key
 * @property {BookingTypeConfig} rule - Booking type configuration
 * @property {number} step - Current step (0-4)
 * @property {string} weekStart - Monday date key for current week view
 * @property {WeekSchedule|null} week - Week schedule data
 * @property {boolean} loadingWeek - Whether week data is loading
 * @property {string|null} date - Selected date key
 * @property {number} start - Selected start time in minutes
 * @property {number} duration - Selected duration in minutes
 * @property {BookingAuth} auth - Authentication state
 * @property {BookingDetails} details - User details
 * @property {Object|null} result - Booking result
 * @property {boolean} submitting - Whether submission is in progress
 * @property {string} error - Error message
 */

/**
 * @typedef {Object} AppState
 * @property {"home"|"booking"} screen - Current screen
 * @property {AppConfig} config - Application configuration
 * @property {WeekSchedule|null} currentWeek - Current week data for home screen
 * @property {string} currentMonday - Monday date key for current week
 * @property {BookingState|null} booking - Current booking state
 * @property {boolean} loading - Whether initial load is in progress
 * @property {boolean} offline - Whether in offline mode
 * @property {string} notice - Global notice message
 */

/**
 * @typedef {Object} SlotStatus
 * @property {boolean} ok - Whether slot is available
 * @property {string} reason - Reason code if not ok
 * @property {string} label - Human-readable status label
 * @property {TimeBlock|null} block - Conflicting block if overlap
 */

/**
 * @typedef {Object} SlotOptions
 * @property {number} step - Time step in minutes
 * @property {number} leadHours - Lead time in hours
 * @property {Date} now - Current time
 * @property {string} timeZone - IANA timezone
 * @property {string} today - Today's date key
 * @property {string} horizonEnd - Last bookable date key
 */

/**
 * @typedef {Object} MediaController
 * @property {function(string): void} setActive - Set active media type
 * @property {function(boolean): void} setPlaying - Set playing state
 * @property {function(): void} toggle - Toggle playing state
 * @property {boolean} playing - Current playing state
 * @property {string|null} active - Active media type key
 */