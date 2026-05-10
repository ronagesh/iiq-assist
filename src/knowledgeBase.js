const knowledgeBase = [
  {
    issue: "Chromebook won't turn on",
    category: "IT",
    device_or_asset: "Chromebook",
    symptoms: "Screen is completely black, no lights, no sound when pressing power button",
    resolution_steps: [
      "Hold the power button down for 10 full seconds, then release.",
      "Wait 5 seconds, then press the power button once to turn it on.",
      "If nothing happens, plug in the charger and wait 2 minutes — the battery may be completely dead.",
      "Try turning it on again while plugged in.",
      "If there's still no response, hold Refresh (the circular arrow key) and press the power button at the same time.",
      "If the screen turns on but gets stuck on a logo, let it sit plugged in for 30 minutes and try again."
    ],
    escalate_if: "Device still won't turn on after charging for 30 minutes, or shows a cracked screen or physical damage.",
    priority: "high",
    avg_resolution_minutes: 10
  },
  {
    issue: "Chromebook cracked screen",
    category: "IT",
    device_or_asset: "Chromebook",
    symptoms: "Screen has visible cracks, lines, dark spots, or is completely black with physical damage",
    resolution_steps: [
      "Do not try to use the Chromebook — a cracked screen can have sharp edges.",
      "Note the asset tag number (usually a sticker on the bottom or back of the device).",
      "Place the Chromebook in a protective sleeve or bag if available.",
      "Submit a support ticket so IT can arrange a repair or replacement.",
      "In the meantime, request a loaner device from your school's IT office."
    ],
    escalate_if: "Always escalate — cracked screens require physical repair or device swap.",
    priority: "high",
    avg_resolution_minutes: 1440
  },
  {
    issue: "Google login error 403",
    category: "IT",
    device_or_asset: "Chromebook",
    symptoms: "Student sees 'Error 403' or 'Access Denied' when trying to sign into Google or a school app",
    resolution_steps: [
      "Sign out of the Chromebook completely: click the clock in the bottom right corner, then click the power icon, then 'Sign out'.",
      "Sign back in using the student's full school email (e.g. student@yourschool.org).",
      "If the error appears again, open Chrome, go to google.com, and click 'Sign out' from all Google accounts.",
      "Clear the browser cache: press Ctrl + Shift + Delete, select 'All time', check all boxes, and click 'Clear data'.",
      "Try signing in again.",
      "If the student is trying to access a specific app or website, check that they're using their school account, not a personal one."
    ],
    escalate_if: "Error persists after signing out and clearing cache, or the student's account may have been suspended or not yet provisioned.",
    priority: "medium",
    avg_resolution_minutes: 10
  },
  {
    issue: "Student can't log into Google account",
    category: "IT",
    device_or_asset: "Chromebook",
    symptoms: "Student gets 'Wrong password', 'Account not found', or is stuck at the login screen",
    resolution_steps: [
      "Double-check the student is typing their full school email address, not just their username.",
      "Make sure Caps Lock is not on — the Caps Lock key on Chromebooks is where Caps Lock usually is, or check for an 'A' indicator on screen.",
      "Try the password reset process: on the login screen, click 'Forgot password?' if available.",
      "If the student knows their password works on another device, sign out of the Chromebook and sign back in.",
      "Try on a different Chromebook to confirm whether the issue is with the account or the device."
    ],
    escalate_if: "Password reset is not available to the student, the account doesn't exist in the system, or the student is locked out across multiple devices.",
    priority: "medium",
    avg_resolution_minutes: 15
  },
  {
    issue: "WiFi not connecting on Chromebook",
    category: "IT",
    device_or_asset: "Chromebook",
    symptoms: "No internet, WiFi icon shows an 'X' or exclamation mark, pages won't load",
    resolution_steps: [
      "Click the clock in the bottom-right corner of the screen.",
      "Click the WiFi icon to open network settings.",
      "If it shows connected but no internet, click on the network name and select 'Forget'.",
      "Wait 10 seconds, then click the WiFi name again to reconnect.",
      "If the network isn't showing up at all, toggle WiFi off and back on using the toggle in that same menu.",
      "Restart the Chromebook: click the clock, click the power icon, select 'Restart'.",
      "After restart, reconnect to the WiFi network."
    ],
    escalate_if: "Multiple devices in the classroom can't connect, or the network doesn't appear in the list at all.",
    priority: "medium",
    avg_resolution_minutes: 5
  },
  {
    issue: "WiFi not connecting on iPad",
    category: "IT",
    device_or_asset: "iPad",
    symptoms: "iPad shows no WiFi signal, or connects but has no internet access",
    resolution_steps: [
      "Go to Settings (the gear icon), then tap 'WiFi'.",
      "If WiFi is off, tap the toggle to turn it on.",
      "Find your school's network name in the list and tap it.",
      "If it shows 'No Internet Connection', tap the (i) next to the network name and tap 'Forget This Network'.",
      "Wait 10 seconds, then tap the network name to reconnect.",
      "If that doesn't work, go to Settings > General > Transfer or Reset iPad > Reset > Reset Network Settings. Note: this will forget all saved WiFi passwords.",
      "Restart the iPad by holding the top button and a volume button until the 'slide to power off' appears."
    ],
    escalate_if: "iPad still can't connect after network reset, or the MDM profile may have been removed.",
    priority: "medium",
    avg_resolution_minutes: 10
  },
  {
    issue: "Smartboard no signal",
    category: "IT",
    device_or_asset: "Smartboard / Interactive Display",
    symptoms: "Smartboard shows 'No Signal', 'No Input', or a black/blue screen",
    resolution_steps: [
      "Check that the HDMI or USB-C cable connecting your computer to the board is firmly plugged in at both ends.",
      "Unplug the cable and plug it back in.",
      "On the board's remote or side panel, press the 'Source' or 'Input' button to cycle through inputs until you find the one your computer is connected to.",
      "On your computer, press the Windows key + P (Windows) or go to System Preferences > Displays (Mac) and select 'Mirror' or 'Extend'.",
      "If using a laptop, try pressing Fn + F4, Fn + F5, or Fn + F8 depending on your laptop brand to activate the external display.",
      "Turn the smartboard completely off using the power button, wait 30 seconds, then turn it back on."
    ],
    escalate_if: "Board shows signal but image is distorted, the board is making unusual sounds, or power cycling doesn't help.",
    priority: "high",
    avg_resolution_minutes: 8
  },
  {
    issue: "Smartboard touch not responding",
    category: "IT",
    device_or_asset: "Smartboard / Interactive Display",
    symptoms: "Can see the screen but touching it does nothing, or touches register in the wrong place",
    resolution_steps: [
      "Make sure nothing is resting against the board frame — even a pen tray touching the edge can confuse the touch sensors.",
      "Clean the board surface with a dry, soft cloth — smudges near the edges can interfere with touch.",
      "Check if the touch USB cable (separate from the video cable) is plugged into both the board and your computer.",
      "Unplug and replug the USB cable connecting the board to the computer.",
      "On the board's menu or settings (usually accessed via a small button on the frame), look for a 'Calibrate' or 'Orient' option and follow the on-screen instructions.",
      "Restart your computer while leaving the board on."
    ],
    escalate_if: "Touch stops working entirely after recalibration, or only part of the board responds to touch.",
    priority: "medium",
    avg_resolution_minutes: 10
  },
  {
    issue: "Projector not displaying",
    category: "IT",
    device_or_asset: "Projector",
    symptoms: "Projector is on but shows a blank screen, 'No Signal', or just the projector's logo",
    resolution_steps: [
      "Check that the HDMI or VGA cable is securely connected to both your computer and the projector.",
      "Press the 'Source' or 'Input' button on the projector remote or top panel to cycle through inputs.",
      "On your computer, press Windows + P and choose 'Duplicate' or 'Mirror'. On a Mac, go to System Settings > Displays and enable mirroring.",
      "Try pressing Fn + F4, Fn + F5, or Fn + F8 on your laptop keyboard to activate the video output.",
      "Turn the projector off, wait 30 seconds, and turn it back on.",
      "Try a different cable if one is available."
    ],
    escalate_if: "Projector shows a colored tint, dark spots on the image, or the lamp warning light is on.",
    priority: "high",
    avg_resolution_minutes: 7
  },
  {
    issue: "Projector lamp warning light on",
    category: "IT",
    device_or_asset: "Projector",
    symptoms: "Orange or red lamp indicator light is on or flashing, image is dim or yellowish",
    resolution_steps: [
      "Note the projector's make, model, and room number.",
      "Do not turn the projector off and on repeatedly — this shortens lamp life.",
      "Let the projector cool down by leaving it on standby (fan running) for 5 minutes before turning it off fully.",
      "Submit a ticket for a lamp replacement — this is normal maintenance and IT will handle it.",
      "As a temporary workaround, you can still use the projector but the image will be dim. Position window blinds to reduce glare."
    ],
    escalate_if: "Always escalate — lamp replacement requires IT. Do not attempt to replace it yourself.",
    priority: "medium",
    avg_resolution_minutes: 2880
  },
  {
    issue: "Printer offline",
    category: "IT",
    device_or_asset: "Printer",
    symptoms: "Print jobs queue up but nothing prints, printer status shows 'Offline' on computer",
    resolution_steps: [
      "Check that the printer is turned on — look for a green or blue power light.",
      "Check that the USB or network cable is plugged into the printer and the wall or computer.",
      "On your computer, go to Settings > Printers & Scanners (Windows) or System Settings > Printers & Scanners (Mac).",
      "Click on the printer and look for a 'Use Printer Online' option or similar — click it.",
      "Cancel all pending print jobs by right-clicking the printer and selecting 'See what's printing', then canceling each job.",
      "Turn the printer off, wait 10 seconds, turn it back on, and wait for it to fully start up before printing again.",
      "Try printing a test page from the printer's own menu buttons."
    ],
    escalate_if: "Printer shows error lights or error codes on its display, or it's a network printer that no one in the building can reach.",
    priority: "medium",
    avg_resolution_minutes: 10
  },
  {
    issue: "Printer paper jam",
    category: "IT",
    device_or_asset: "Printer",
    symptoms: "Printer stops mid-job, beeps, or shows a paper jam error on its display",
    resolution_steps: [
      "Turn the printer off before removing jammed paper — this prevents damage to the rollers.",
      "Open every door and tray on the printer — front, back, and side panels. Jammed paper can be in unexpected places.",
      "Gently pull the paper toward you in the direction it was traveling — never yank it sideways or backward.",
      "Remove every scrap of paper, even small torn pieces, as leftover bits cause repeat jams.",
      "Close all doors and trays firmly.",
      "Turn the printer back on and wait for it to complete its startup check.",
      "Try a small test print of 1 page before sending a full job."
    ],
    escalate_if: "Paper tears and pieces remain stuck inside that you can't reach, or jams keep happening repeatedly.",
    priority: "low",
    avg_resolution_minutes: 8
  },
  {
    issue: "Document camera not working",
    category: "IT",
    device_or_asset: "Document Camera",
    symptoms: "Black screen in the document camera app, 'Device not found' error, or no image on the projector",
    resolution_steps: [
      "Check that the document camera's USB cable is firmly plugged into your computer.",
      "Make sure the camera is powered on — most have a power button on the neck or base.",
      "Open the document camera's software (usually called something like 'IPEVO Visualizer', 'AVerVision', or 'ELMO'). If it's not installed, try opening your video conferencing app and selecting the document camera as a camera source.",
      "Unplug the USB cable, wait 10 seconds, and plug it back in.",
      "Restart your computer if the camera is still not detected.",
      "Check that the camera lens isn't physically blocked or covered."
    ],
    escalate_if: "Camera is detected but image is completely dark even with the lamp on, or the device makes a burning smell.",
    priority: "medium",
    avg_resolution_minutes: 10
  },
  {
    issue: "Classroom speakers no sound",
    category: "IT",
    device_or_asset: "Classroom Audio System / Speakers",
    symptoms: "No sound from classroom speakers, audio plays only through laptop, or very low volume",
    resolution_steps: [
      "Check the volume on your computer — click the speaker icon in the taskbar and make sure it's not muted and is turned up.",
      "Right-click the speaker icon (Windows) and select 'Open Sound settings'. Under 'Output', make sure the classroom speakers or amplifier are selected, not your laptop's built-in speakers.",
      "Check the physical volume knob on the speaker amplifier or wall panel — it may have been turned down.",
      "Check that the audio cable from your computer to the speaker system is plugged in at both ends.",
      "If the speakers have a power switch, make sure they are turned on.",
      "Try playing audio from a different app to rule out a single app being muted."
    ],
    escalate_if: "Speakers make crackling, buzzing, or popping sounds, or the amplifier shows error lights.",
    priority: "medium",
    avg_resolution_minutes: 8
  },
  {
    issue: "iPad not enrolling in MDM",
    category: "IT",
    device_or_asset: "iPad",
    symptoms: "iPad shows 'Remote Management' screen during setup but enrollment fails, or apps from IT aren't appearing",
    resolution_steps: [
      "Make sure the iPad is connected to WiFi before attempting enrollment.",
      "On the 'Remote Management' screen, tap 'Enroll' or 'Next' and wait — enrollment can take up to 2 minutes.",
      "If it fails with an error, note the exact error message.",
      "Go to Settings > General > VPN & Device Management. If a profile is listed there but shows an error, tap it and remove it, then restart the iPad.",
      "After restarting, go back through the setup process or re-enroll from Settings.",
      "Make sure the iPad's date and time are set correctly: Settings > General > Date & Time > Set Automatically."
    ],
    escalate_if: "Enrollment consistently fails with an error code, or the device was previously assigned to another student and shows the wrong name.",
    priority: "high",
    avg_resolution_minutes: 20
  },
  {
    issue: "Chromebook keyboard not working",
    category: "IT",
    device_or_asset: "Chromebook",
    symptoms: "Some or all keys don't respond, typing produces wrong characters, or keyboard is completely unresponsive",
    resolution_steps: [
      "Restart the Chromebook first — many keyboard issues resolve on their own after a restart.",
      "Check if the issue is specific to one app: open a different app (like Google Docs) and try typing there.",
      "Look for liquid damage around the keys — if you see stickiness or residue, submit a repair ticket.",
      "Try pressing Escape and then typing again — sometimes a stuck modifier key causes odd behavior.",
      "Press Ctrl + Shift + U and type something to test the keyboard in the Unicode entry mode.",
      "If only certain keys work, do a hard reset: hold Refresh + Power for 3 seconds."
    ],
    escalate_if: "Keys are physically stuck or broken, liquid was spilled on the device, or a hard reset doesn't resolve the issue.",
    priority: "high",
    avg_resolution_minutes: 15
  },
  {
    issue: "Charging cart not charging devices",
    category: "IT",
    device_or_asset: "Charging Cart",
    symptoms: "Devices left in cart overnight are still dead in the morning, or only some slots are charging",
    resolution_steps: [
      "Check that the charging cart itself is plugged into the wall outlet and that the outlet has power (try plugging something else in).",
      "Look for a master power switch or breaker on the cart — some carts have one on the side or back.",
      "Open the cart and check that each charging cable is firmly plugged into the device.",
      "Check if the cart has a circuit breaker or reset button — usually a small red or black button. Press it once.",
      "Check that devices are properly seated in their slots and the charging connectors are aligned.",
      "Plug one device directly into a wall outlet to confirm the device itself charges — this rules out a problem with the device's charging port."
    ],
    escalate_if: "Cart makes a burning smell, shows sparks, or the circuit breaker keeps tripping after reset.",
    priority: "high",
    avg_resolution_minutes: 15
  },
  {
    issue: "Zoom audio not working",
    category: "IT",
    device_or_asset: "Computer / Chromebook",
    symptoms: "Others can't hear you, you can't hear others, or microphone shows no activity in Zoom",
    resolution_steps: [
      "In your Zoom meeting, click the arrow next to the microphone icon at the bottom left. Make sure your computer's microphone and speaker are selected — not 'Same as System' if that's causing issues.",
      "Check that you are not on mute — the microphone icon should not have a red line through it.",
      "Click 'Test Speaker and Microphone' in Zoom's audio settings to verify each is working.",
      "Check your computer's system volume and make sure it's not muted.",
      "If using a Chromebook, go to Settings > Device > Audio and make sure the correct microphone is selected.",
      "Close Zoom completely and reopen it, then rejoin the meeting.",
      "If using an external headset, unplug it and replug it, then reselect it in Zoom's audio settings."
    ],
    escalate_if: "Microphone is not detected by the system at all, or audio works in every app except Zoom.",
    priority: "medium",
    avg_resolution_minutes: 8
  },
  {
    issue: "Screen mirroring not working",
    category: "IT",
    device_or_asset: "iPad / Chromebook / Laptop",
    symptoms: "AirPlay, Chromecast, or screen mirroring option doesn't show up, or casting fails to connect",
    resolution_steps: [
      "Make sure both your device and the display (TV, smartboard, or Chromecast) are on the same WiFi network. This is the most common cause.",
      "For AirPlay from iPad: swipe down from the top right corner, tap 'Screen Mirroring', and select the TV or Apple TV from the list.",
      "For Chromecast from Chromebook: open Chrome, click the three dots in the top right, select 'Cast', and choose your display.",
      "If the device doesn't appear in the list, turn the display off and back on, then wait 30 seconds.",
      "Restart your device and try again.",
      "Make sure no one else in the room is already casting to that display — only one device can cast at a time."
    ],
    escalate_if: "The display device never appears in the list even on the correct network, or connectivity works briefly then keeps dropping.",
    priority: "medium",
    avg_resolution_minutes: 10
  },
  {
    issue: "Chromebook running slow",
    category: "IT",
    device_or_asset: "Chromebook",
    symptoms: "Pages take a long time to load, apps freeze, keyboard input lags, or the device feels sluggish",
    resolution_steps: [
      "Close any tabs or apps you're not using — too many open tabs is the most common cause of slowdowns.",
      "To see what's using resources, press Search + Escape to open the Task Manager. Close anything using a lot of memory.",
      "Restart the Chromebook: click the clock, then the power icon, then 'Restart'. This clears memory.",
      "After restarting, open only the tabs you need.",
      "Check for pending updates: go to Settings > About ChromeOS > Check for updates. Install any available updates and restart.",
      "Clear browsing data: open Chrome, press Ctrl + Shift + Delete, select 'Last 7 days', check 'Cached images and files', and click 'Clear data'."
    ],
    escalate_if: "Device is slow even with no apps open after a fresh restart, or it's more than 5 years old and may need replacement.",
    priority: "low",
    avg_resolution_minutes: 15
  },
  {
    issue: "Classroom HVAC not working",
    category: "Facilities",
    device_or_asset: "HVAC / Heating & Cooling System",
    symptoms: "Room is too hot or too cold, no air coming from vents, or thermostat is unresponsive",
    resolution_steps: [
      "Check the thermostat — make sure it's set to the correct mode (Heat or Cool) and the temperature setting is reasonable.",
      "Look at the vents in the ceiling or walls — make sure they're open and not physically blocked by furniture or boxes.",
      "If the thermostat has a display, note any error codes or blinking lights and include them in your ticket.",
      "Check if other nearby classrooms have the same issue — this helps determine if it's a building-wide problem.",
      "Submit a facilities ticket with your room number and whether it's too hot or too cold."
    ],
    escalate_if: "Always escalate HVAC issues — do not attempt to adjust or open mechanical panels yourself.",
    priority: "high",
    avg_resolution_minutes: 240
  },
  {
    issue: "Lights flickering in classroom",
    category: "Facilities",
    device_or_asset: "Classroom Lighting",
    symptoms: "One or more lights flicker, flash on and off, buzz, or don't turn on at all",
    resolution_steps: [
      "Note which specific lights are flickering (e.g., 'the two lights near the door' or 'all lights on the left side').",
      "Try switching the lights off and back on using the classroom light switch.",
      "If it's a single fluorescent tube that flickers, it may be a dying bulb — note the location and submit a ticket.",
      "If multiple lights are flickering or there's a buzzing sound, move students away from that area as a precaution.",
      "Submit a facilities ticket with your room number and a description of which lights are affected."
    ],
    escalate_if: "You see sparks, smell burning, or a breaker has tripped. Evacuate the area and call the main office immediately.",
    priority: "medium",
    avg_resolution_minutes: 120
  },
  {
    issue: "Projector mount loose",
    category: "Facilities",
    device_or_asset: "Ceiling-Mounted Projector",
    symptoms: "Projector is visibly tilted, wobbling, or has dropped lower than usual from the ceiling",
    resolution_steps: [
      "Do not touch or attempt to adjust the projector mount yourself.",
      "Move students and furniture away from the area directly below the projector.",
      "Turn off the projector if it's safe to do so using the remote.",
      "Submit an urgent facilities ticket with your room number — include a photo if possible.",
      "Do not use the projector until the mount has been inspected and secured by facilities staff."
    ],
    escalate_if: "Always escalate — a loose ceiling mount is a safety hazard.",
    priority: "urgent",
    avg_resolution_minutes: 60
  },
  {
    issue: "Door lock not working",
    category: "Facilities",
    device_or_asset: "Classroom / Building Door Lock",
    symptoms: "Door won't lock, key card not working, keypad unresponsive, or door won't close properly",
    resolution_steps: [
      "For a key card lock: make sure your card isn't damaged or demagnetized. Try holding it flat against the reader rather than swiping.",
      "For a keypad lock: check if the battery indicator light is blinking — low batteries are a common cause.",
      "Check that the door is fully closed before trying to lock it — misalignment prevents the bolt from engaging.",
      "Do not force the lock or try to wedge the door shut.",
      "For security-related lock failures (classroom lockdown capability), notify the main office immediately.",
      "Submit a facilities ticket with the exact door location."
    ],
    escalate_if: "Door cannot be secured at all, the issue is with an exterior door, or you are unable to enter or exit a room safely.",
    priority: "urgent",
    avg_resolution_minutes: 60
  },
  {
    issue: "Leaking ceiling",
    category: "Facilities",
    device_or_asset: "Ceiling / Roof",
    symptoms: "Water dripping from ceiling, wet ceiling tiles, water stains appearing, or bulging ceiling tiles",
    resolution_steps: [
      "Move students and all electronics away from the affected area immediately.",
      "Place a trash can or bucket under any active drip to contain water.",
      "Do not touch bulging ceiling tiles — they may be holding water and could collapse.",
      "If water is near electrical outlets, light fixtures, or equipment, turn off the lights in that area if you can do so safely from the wall switch.",
      "Call the main office or front desk immediately — do not wait to submit a ticket for active water leaks.",
      "Take a photo to document the damage if safe to do so."
    ],
    escalate_if: "Always escalate immediately — active water leaks near electrical systems are a safety emergency.",
    priority: "urgent",
    avg_resolution_minutes: 120
  },
  {
    issue: "Broken window",
    category: "Facilities",
    device_or_asset: "Classroom Window",
    symptoms: "Window glass is cracked, shattered, or has a visible hole; window won't open or close; frame is damaged",
    resolution_steps: [
      "Keep students away from the broken glass — establish a clear boundary of at least 3 feet.",
      "Do not attempt to clean up broken glass yourself.",
      "If the window is broken to the outside and weather is a concern, notify the main office immediately so a temporary covering can be arranged.",
      "If there are sharp exposed edges near a walkway, block the area with desks or chairs and post a visual warning.",
      "Submit a facilities ticket with your room number and a description of the damage.",
      "Document the damage with a photo if safe to do so."
    ],
    escalate_if: "Always escalate — broken windows require facilities. If there is an injury or vandalism involved, contact the main office immediately.",
    priority: "urgent",
    avg_resolution_minutes: 480
  },
  {
    issue: "Bathroom facilities issue",
    category: "Facilities",
    device_or_asset: "Bathroom / Restroom",
    symptoms: "Toilet won't flush, sink not working, overflowing toilet, no hot water, or out of supplies",
    resolution_steps: [
      "For an overflowing toilet: do not flush again. Look for the water shutoff valve on the wall behind the toilet and turn it clockwise to stop the water.",
      "Post a sign on the bathroom door that it is out of service and direct students to the nearest alternate restroom.",
      "For a clogged toilet: do not attempt to plunge it yourself if water is near the rim.",
      "For supply shortages (paper towels, soap, toilet paper): submit a routine facilities request.",
      "Submit a facilities ticket with the specific bathroom location (building, floor, room number or description).",
      "For a serious overflow or flooding, call the main office immediately."
    ],
    escalate_if: "Active flooding or sewage backup — contact the main office immediately and keep all students out of the area.",
    priority: "high",
    avg_resolution_minutes: 30
  },
  {
    issue: "Cafeteria equipment not working",
    category: "Facilities",
    device_or_asset: "Cafeteria Kitchen Equipment",
    symptoms: "Oven, dishwasher, refrigerator, or serving equipment is not functioning, making unusual sounds, or showing error codes",
    resolution_steps: [
      "Do not attempt to repair cafeteria equipment yourself.",
      "For refrigeration units: note the internal temperature if a thermometer is visible. If above 41°F for more than 2 hours, food safety protocols may require discarding contents — contact your food services director.",
      "Note the equipment's model number and error code if displayed.",
      "For equipment that is sparking, smoking, or making burning smells: turn it off using its power switch and unplug it if safe to do so. Do not use it.",
      "Submit a facilities ticket immediately with equipment type and location.",
      "Contact food services management so meal planning can be adjusted if needed."
    ],
    escalate_if: "Any electrical smell, smoke, or spark from equipment — treat as a potential fire hazard and contact the main office.",
    priority: "urgent",
    avg_resolution_minutes: 240
  },
  {
    issue: "Gym equipment damaged",
    category: "Facilities",
    device_or_asset: "Gymnasium Equipment",
    symptoms: "Equipment is broken, unstable, has sharp edges, or is otherwise unsafe to use",
    resolution_steps: [
      "Stop the activity and move students away from the damaged equipment immediately.",
      "Do not allow students to use the equipment until it has been inspected and repaired.",
      "If the equipment can be moved, relocate it to a storage area or against a wall where it won't be accidentally used.",
      "If it cannot be moved, place visible markers (cones, tape, signs) around it.",
      "Document the damage with a photo.",
      "Submit a facilities ticket with a description of the equipment and the nature of the damage.",
      "Note the incident in your records in case of any follow-up."
    ],
    escalate_if: "A student was injured — follow your school's incident reporting procedure and notify the main office immediately.",
    priority: "high",
    avg_resolution_minutes: 120
  },
  {
    issue: "Exterior door alarm triggered",
    category: "Facilities",
    device_or_asset: "Exterior Door / Alarm System",
    symptoms: "Door alarm is sounding, door is propped open, or an emergency exit is being held open without cause",
    resolution_steps: [
      "Do not ignore a sounding door alarm — approach calmly but promptly.",
      "Check if someone accidentally propped the door open or if a door did not close fully.",
      "Close the door firmly — in many cases the alarm will stop on its own within 15 seconds.",
      "If the alarm continues after closing the door, contact the main office or front desk immediately.",
      "Do not attempt to silence the alarm by covering sensors or disconnecting wiring.",
      "If you cannot determine why the alarm is sounding, treat it as a potential security issue and notify administration."
    ],
    escalate_if: "Always notify the main office when an exterior door alarm triggers — security staff need to verify no unauthorized access occurred.",
    priority: "urgent",
    avg_resolution_minutes: 15
  }
]

export default knowledgeBase
