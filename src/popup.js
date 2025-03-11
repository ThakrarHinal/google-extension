let recognizing = false;
const recordBtn = document.getElementById('record-btn');
const status = document.getElementById('status');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';

recordBtn.addEventListener('click', () => {
    console.log("working>>>")
    console.log({recognition, recognizing})
    console.log("Record Button:", recordBtn);
  if (recognizing) {
    recognition.stop();
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      console.log("Microphone access granted");
      stream.getTracks().forEach(track => track.stop());  // Stop the mic immediately after getting permission
      recognition.start();  // Start speech recognition
    })
    .catch(error => {
      console.error("Microphone access denied:", error);
      status.textContent = 'Microphone access denied. Please enable it and try again.';
    });
});

recognition.onstart = () => {
    console.log("recognition has started>>>>")
  recognizing = true;
  status.textContent = 'Listening...';
};

recognition.onend = () => {
  recognizing = false;
  status.textContent = 'Press the button and speak...';
};

recognition.onresult = async (event) => {
  const transcript = event.results[0][0].transcript;
  status.textContent = `You said: "${transcript}"`;
  
  const eventData = parseEvent(transcript);
  if (eventData) {
    status.textContent = 'Creating event...';
    const success = await createCalendarEvent(eventData);
    status.textContent = success ? 'Event created successfully!' : 'Failed to create event.';
  } else {
    status.textContent = 'Could not understand the event details.';
  }
};

recognition.onerror = (event) => {
    console.error("Recognition Error:", event.error);
    status.textContent = `Error: ${event.error}`;
};


// Parse voice input into event data
function parseEvent(input) {
  const dateMatch = input.match(/\b(?:on\s)?(\w+\s\d{1,2}(?:st|nd|rd|th)?)\b/);
  const timeMatch = input.match(/\b(?:at\s)?(\d{1,2}(:\d{2})?\s?(AM|PM)?)\b/i);
  const titleMatch = input.match(/(?:a\s)?(.*?)(?:\s(on|at)\s|$)/i);

  if (titleMatch) {
    return {
      summary: titleMatch[1] || 'Untitled Event',
      date: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
      time: timeMatch ? timeMatch[1] : '10:00 AM'
    };
  }
  return null;
}

// Create event using Google Calendar API
async function createCalendarEvent(eventData) {
  try {
    console.log("into create cal function>>>>")
      const token = await getAuthToken();
      console.log("into create functions>>>>>>", {token})
      const startDate = new Date(`${eventData.date} ${eventData.time}`);
const endDate = new Date(startDate);
endDate.setHours(startDate.getHours() + 1);
    const event = {
      summary: eventData.summary,
      start: {
        dateTime: startDate.toISOString()
      },
      end: {
        dateTime: endDate.toISOString()
      }
    };

    console.log({event})

    let response;
    try {
        
         response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });
    
        console.log({response: response.json()})
    } catch (error) {
        console.log({error}, "checking error")
    }
    return response.ok;
} catch (error) {
    console.error('Error creating event:', error);
    return false;
  }
}

// Get OAuth token
async function getAuthToken() {
  const result =  new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        console.log("into else condition>>>>>")
        resolve(token);
      }
    });
  });
  console.log({result})
  return result
}
