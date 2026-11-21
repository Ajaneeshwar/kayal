# Kayal Log Malayalam review

**Machine-checked only. A native Malayalam speaker has yet to verify the wording or the spoken delivery.**

Sarvam checked 154 fixed strings (151 React locale entries and three legacy crew strings) and 12 sample server replies. It took 29 translation calls. This review updated 51 locale entries.

## Five-minute native review

Start on the crew page. The main button reads **സംസാരിക്കാൻ ടാപ്പ് ചെയ്യുക**. Sarvam read it back as “Tap to speak.” Read the ten lines below aloud and flag anything a boat crew member would misunderstand.

1. **Crew recording prompt.** നിങ്ങൾ ഒഴിഞ്ഞ മാലിന്യത്തിന്റെ തരവും അളവും, അത് ഒഴിഞ്ഞ സ്ഥലവും പറയുക<br>
   Check that it asks for the kind of waste, how much, and where it was emptied.
2. **Crew example.** ഞങ്ങൾ കുമരകം എസ്.ടി.പിയിലെ ടോയ്‌ലറ്റ് ടാങ്കിൽ നിന്ന് 800 ലിറ്റർ മലിനജലം ഒഴുക്കിക്കളഞ്ഞു.<br>
   Check that the speaker emptied 800 litres from the toilet tank at Kumarakom STP.
3. **Spoken retry reply.** അതിൽ ഒരു മാലിന്യ കൈമാറ്റം കണ്ടെത്താൻ എനിക്ക് കഴിഞ്ഞില്ല. നിങ്ങൾ എന്താണ് ഒഴിഞ്ഞതെന്നോ കൈമാറിയതെന്നോ, എവിടെയാണെന്നും ദയവായി പറയുക.<br>
   Check that it asks where the handover happened. The last clause came back as “where it is.”
4. **Spoken location reminder.** സേവ് ചെയ്തു, പക്ഷേ സ്ഥിരീകരിച്ചിട്ടില്ല. അടുത്ത തവണ കളക്ഷൻ പോയിന്റിൽ ലൊക്കേഷൻ ഓൺ ചെയ്യുക.<br>
   Check that “next time” and “at the collection point” sound natural together.
5. **Verified seal.** ഈ ബോട്ട് ഒരു ശുദ്ധീകരണ പ്ലാന്റിൽ അതിന്റെ മലിനജല ടാങ്ക് ഒഴിഞ്ഞു. ലോഗ് എൻട്രി സമർപ്പിച്ച സമയത്ത് ജീവനക്കാരുടെ ഫോൺ അവിടെ ഉണ്ടായിരുന്നു.<br>
   Check that it puts the crew’s phone at the plant when they logged the emptying.
6. **Declared-only seal.** ജീവനക്കാർ പറയുന്നു, "ഞങ്ങൾ മലിനജല ടാങ്ക് ഒഴിഞ്ഞു." മാലിന്യം എവിടെ പോയെന്ന് സ്ഥിരീകരിക്കുന്നില്ല.<br>
   Check that the crew claimed to have emptied the tank and that the destination is unconfirmed.
7. **Overdue seal.** കഴിഞ്ഞ 90 ദിവസത്തിനുള്ളിൽ, ബോട്ട് അതിന്റെ മലിനജല ടാങ്ക് ഒഴിഞ്ഞതിനെക്കുറിച്ച് ലോഗ് എൻട്രി ചെയ്തിട്ടില്ല.<br>
   Check that the boat has no log of emptying in 90 days.
8. **Location proof chip.** ലൊക്കേഷനിൽ നിന്നുള്ള തെളിവ്<br>
   Check that this suggests evidence from the phone’s location and reads differently from the Place field.
9. **Report dumping button.** വെള്ളത്തിലേക്ക് മാലിന്യം തള്ളിയതിനെക്കുറിച്ച് റിപ്പോർട്ട് ചെയ്യുക<br>
   Check that this asks the guest to report waste dumped into the water.
10. **Inspector sign-in description.** എല്ലാ ബോട്ടുകളും ഒരൊറ്റ മാപ്പിൽ കാണുക, മാലിന്യം രേഖപ്പെടുത്താനുള്ള സമയപരിധി കഴിഞ്ഞ ബോട്ടുകൾ ആദ്യം കാണുക.<br>
   Check whether the sort order clearly puts the most overdue boats first.

The full screen inventory and the [before-and-after log](#before-and-after) follow. **✱** marks an edited locale entry. **†** marks a sample reply generated during this review.

## Crew

The React screens use the four locale catalogues for fixed Malayalam. The three legacy strings are the only Malayalam literals outside those catalogues. The server keeps its reply templates in English and translates them when a crew member speaks or types. There are no fixed Malayalam reply templates in [the reply rules](../lib/logic.mjs) or [the voice pipeline](../lib/pipeline.mjs). The samples cover the save and verification branches, the retry reply, and the collection-point question branches. The retry and location-reminder samples used the exact unbatched inputs the server sends. The other samples used batches. Transcripts, facility names and other variable content depend on the entry.

| English | Malayalam | Sarvam back-translation |
| --- | --- | --- |
| Tap to speak | സംസാരിക്കാൻ ടാപ്പ് ചെയ്യുക | Tap to speak |
| Listening. Tap to stop. | കേൾക്കുന്നു. നിർത്താൻ ടാപ്പ് ചെയ്യുക. | I hear you. Tap to stop. |
| Sending | അയയ്ക്കുന്നു | Sending |
| Answered. Tap to log another. | മറുപടി നൽകി. മറ്റൊന്ന് രേഖപ്പെടുത്താൻ ടാപ്പ് ചെയ്യുക. | Have replied. Tap to record another one. |
| Say what you emptied, how much, and where **✱** | നിങ്ങൾ ഒഴിഞ്ഞ മാലിന്യത്തിന്റെ തരവും അളവും, അത് ഒഴിഞ്ഞ സ്ഥലവും പറയുക | Please specify the type and quantity of waste you emptied, as well as the location where it was emptied. |
| We emptied 800 litres from the toilet tank at Kumarakom STP. **✱** | ഞങ്ങൾ കുമരകം എസ്.ടി.പിയിലെ ടോയ്‌ലറ്റ് ടാങ്കിൽ നിന്ന് 800 ലിറ്റർ മലിനജലം ഒഴുക്കിക്കളഞ്ഞു. | We drained 800 liters of sewage from the toilet tank at the Kumarakom STP. |
| Saved. Toilet tank emptying recorded at Kumarakom STP. Your location is confirmed. The receipt photo is saved. **†** | സേവ് ചെയ്തു. ടോയ്ലറ്റ് ടാങ്ക് കാലിയാക്കുന്നത് കുമരകം എസ്.ടി.പി.യിൽ രേഖപ്പെടുത്തി. നിങ്ങളുടെ സ്ഥാനം സ്ഥിരീകരിച്ചു. രസീത് ഫോട്ടോ സേവ് ചെയ്തു. | Saved. Emptying the toilet tank was recorded at Kumarakom STP. Your location has been confirmed. Receipt photo saved. |
| Saved. Plastic and solid waste handover recorded at Alappuzha Dry Waste Centre. Your location is confirmed. The photo is saved. **†** | സേവ് ചെയ്തു. ആലപ്പുഴ ഡ്രൈ വേസ്റ്റ് സെന്ററിൽ പ്ലാസ്റ്റിക്, ഖരമാലിന്യം കൈമാറ്റം ചെയ്തത് രേഖപ്പെടുത്തി. നിങ്ങളുടെ സ്ഥാനം സ്ഥിരീകരിച്ചു. ഫോട്ടോ സേവ് ചെയ്തു. | Saved. Plastic and solid waste transfer recorded at Alappuzha Dry Waste Center. Your location has been confirmed. Photo saved. |
| Saved. Used engine oil handover recorded at Finishing Point Oil Collection. Your location is confirmed. **†** | സേവ് ചെയ്തു. ഫിനിഷിംഗ് പോയിന്റ് ഓയിൽ കളക്ഷനിൽ ഉപയോഗിച്ച എഞ്ചിൻ ഓയിൽ കൈമാറ്റം ചെയ്തത് രേഖപ്പെടുത്തി. നിങ്ങളുടെ സ്ഥാനം സ്ഥിരീകരിച്ചു. | Saved. Used engine oil transfer recorded at Finishing Point Oil Collection. Your location has been confirmed. |
| Saved, but not confirmed. Turn on location at the collection point next time. **†** | സേവ് ചെയ്തു, പക്ഷേ സ്ഥിരീകരിച്ചിട്ടില്ല. അടുത്ത തവണ കളക്ഷൻ പോയിന്റിൽ ലൊക്കേഷൻ ഓൺ ചെയ്യുക. | Saved, but not confirmed. Next time, turn on location at the collection point. |
| Saved, but not confirmed. You are 1.3 kilometres from the nearest sewage collection point, Kumarakom STP. **†** | സേവ് ചെയ്തു, പക്ഷേ സ്ഥിരീകരിച്ചിട്ടില്ല. നിങ്ങൾ അടുത്തുള്ള മലിനജല ശേഖരണ കേന്ദ്രമായ കുമരകം എസ്.ടി.പി.യിൽ നിന്ന് 1.3 കിലോമീറ്റർ അകലെയാണ്. | Saved, but not confirmed. You are 1.3 kilometers away from the nearest sewage collection center, Kumarakom STP. |
| Saved, but not confirmed. Kumarakom STP is marked closed. **†** | സേവ് ചെയ്തു, പക്ഷേ സ്ഥിരീകരിച്ചിട്ടില്ല. കുമരകം എസ്.ടി.പി. അടച്ചതായി അടയാളപ്പെടുത്തിയിരിക്കുന്നു. | Saved, but not confirmed. Kumarakom STP is marked as closed. |
| Saved, but not confirmed. No sewage collection point is listed yet. **†** | സേവ് ചെയ്തു, പക്ഷേ സ്ഥിരീകരിച്ചിട്ടില്ല. മലിനജല ശേഖരണ കേന്ദ്രം ഇതുവരെ ലിസ്റ്റ് ചെയ്തിട്ടില്ല. | Saved, but not confirmed. The sewage collection center is not yet listed. |
| I could not find a waste handover in that. Please say what you emptied or handed over, and where. **†** | അതിൽ ഒരു മാലിന്യ കൈമാറ്റം കണ്ടെത്താൻ എനിക്ക് കഴിഞ്ഞില്ല. നിങ്ങൾ എന്താണ് ഒഴിഞ്ഞതെന്നോ കൈമാറിയതെന്നോ, എവിടെയാണെന്നും ദയവായി പറയുക. | I was unable to find a waste transfer for that. Please tell me what you emptied or transferred, and where it is. |
| No oil collection point is working right now. **†** | ഇപ്പോൾ എണ്ണ ശേഖരണ കേന്ദ്രം പ്രവർത്തിക്കുന്നില്ല. | The oil collection center is not currently operational. |
| Working now: Kumarakom STP. Turn on location to hear the distance. **†** | ഇപ്പോൾ പ്രവർത്തിക്കുന്നു: കുമരകം STP. ദൂരം കേൾക്കാൻ ലൊക്കേഷൻ ഓൺ ചെയ്യുക. | Currently operational: Kumarakom STP. Turn on location to hear the distance. |
| You are at Kumarakom STP, a working sewage collection point. **†** | നിങ്ങൾ കുമരകം STP-യിൽ ആണ്, ഇത് പ്രവർത്തിക്കുന്ന ഒരു മലിനജല ശേഖരണ കേന്ദ്രമാണ്. | You are at Kumarakom STP, which is a sewage collection center that is operational. |
| The nearest working sewage collection point is Kumarakom STP, 1.1 kilometres to the north. **†** | അടുത്തുള്ള പ്രവർത്തിക്കുന്ന മലിനജല ശേഖരണ കേന്ദ്രം കുമരകം STP ആണ്, ഇത് വടക്ക് ദിശയിൽ 1.1 കിലോമീറ്റർ അകലെയാണ്. | The nearest operational sewage collection center is Kumarakom STP, which is 1.1 kilometers away in the north direction. |
| Back to start | തുടക്കത്തിലേക്ക് മടങ്ങുക | Return to the beginning |
| Start recording | റെക്കോർഡിംഗ് ആരംഭിക്കുക | Start recording |
| Stop recording | റെക്കോർഡിംഗ് നിർത്തുക | Stop recording |
| For example | ഉദാഹരണത്തിന് | For example |
| Tank last emptied | ടാങ്ക് അവസാനമായി ഒഴിഞ്ഞത് | Last time the tank was emptied |
| Not logged yet | ഇതുവരെ രേഖപ്പെടുത്തിയിട്ടില്ല | Not recorded yet |
| You | നിങ്ങൾ | You |
| Kayal Log | കായൽ ലോഗ് | Kayal log |
| Play again | വീണ്ടും പ്ലേ ചെയ്യുക | Play again |
| Speaking | സംസാരിക്കുന്നു | Speaking |
| Photo | ഫോട്ടോ | Photo |
| Type | ടൈപ്പ് ചെയ്യുക | Type |
| Speak **✱** | മൈക്രോഫോണിൽ സംസാരിക്കുക | Speak into the microphone. |
| Type what you emptied and where **✱** | നിങ്ങൾ ഏത് തരത്തിലുള്ള മാലിന്യമാണ് ഒഴുക്കിക്കളഞ്ഞതെന്നും എവിടെയാണ് ഒഴുക്കിക്കളഞ്ഞതെന്നും ടൈപ്പ് ചെയ്യുക | Type what kind of waste you emptied and where you emptied it. |
| Send | അയയ്ക്കുക | Send |
| Receipt photo ready. It goes with your next entry. | രസീത് ഫോട്ടോ തയ്യാറാണ്. ഇത് നിങ്ങളുടെ അടുത്ത എൻട്രിയോടൊപ്പം പോകും. | Receipt photo ready. This will go with your next entry. |
| Remove photo **✱** | അറ്റാച്ച് ചെയ്ത ഫോട്ടോ നീക്കം ചെയ്യുക | Remove the attached photo. |
| That photo could not be read | ആ ഫോട്ടോ വായിക്കാൻ കഴിഞ്ഞില്ല | Could not read that photo. |
| Take the photo again. **✱** | ഫോട്ടോ വീണ്ടും എടുക്കുക. | Retake the photo. |
| Saved to the boat’s record | ബോട്ടിന്റെ രേഖയിൽ സേവ് ചെയ്തു | Saved to the boat's record |
| Waste **✱** | മാലിന്യ വസ്തു | Waste material |
| Quantity **✱** | മാലിന്യത്തിന്റെ അളവ് | Amount of waste |
| Place | സ്ഥലം | Location |
| Proof | തെളിവ് | Proof |
| Not said | പറഞ്ഞില്ല | Not stated |
| Fix | ശരിയാക്കുക | Correct it |
| Pick the right amount | ശരിയായ അളവ് തിരഞ്ഞെടുക്കുക | Choose the correct measurement |
| Or type the amount | അല്ലെങ്കിൽ അളവ് ടൈപ്പ് ചെയ്യുക | Otherwise, type the measurement |
| Save amount **✱** | മാലിന്യത്തിന്റെ അളവ് സേവ് ചെയ്യുക | Save the amount of waste. |
| Cancel | റദ്ദാക്കുക | Cancel |
| Corrected | തിരുത്തി | Corrected |
| Toilet tank emptied | ടോയ്‌ലറ്റ് ടാങ്ക് ഒഴിഞ്ഞു | Toilet tank emptied |
| Dry waste handed over | ഉണങ്ങിയ മാലിന്യം കൈമാറി | Dry waste handed over |
| Engine oil handed over | എഞ്ചിൻ ഓയിൽ കൈമാറി | Engine oil handed over |
| Declared **✱** | ക്രൂവിന്റെ പ്രഖ്യാപനം | Crew's declaration |
| Location **✱** | ലൊക്കേഷനിൽ നിന്നുള്ള തെളിവ് | Evidence from the location. |
| Receipt | രസീത് | Receipt |
| The phone was at an open collection point that takes this waste. **✱** | ഫോൺ ഒരു മാലിന്യ ശേഖരണ കേന്ദ്രത്തിലായിരുന്നു. കേന്ദ്രം തുറന്നിട്ടുണ്ട്, ഈ മാലിന്യം സ്വീകരിക്കുന്നു. | The phone was at a waste collection center. The center is open and accepting this waste. |
| The phone was at the collection point, and the photo was read as a receipt. **✱** | ഫോൺ മാലിന്യ ശേഖരണ കേന്ദ്രത്തിലായിരുന്നു, ഫോട്ടോ ഒരു രസീതായി വായിച്ചു. | The phone was at the waste collection center, and the photo was read as a receipt. |
| The phone’s location was not known, so only your word backs this entry. **✱** | ഫോൺ ലൊക്കേഷൻ അജ്ഞാതമായിരുന്നു, അതിനാൽ ഈ എൻട്രിക്കുള്ള ഏക തെളിവ് ക്രൂവിന്റെ പ്രഖ്യാപനമാണ്. | The phone location was unknown, so the only evidence for this entry is the crew's declaration. |
| No collection point takes this kind of waste. **✱** | ഈ തരത്തിലുള്ള മാലിന്യം സ്വീകരിക്കുന്ന മാലിന്യ ശേഖരണ കേന്ദ്രം ലഭ്യമല്ല. | A waste collection center that accepts this type of waste is not available. |
| The phone was too far from the collection point. **✱** | ഫോൺ മാലിന്യ ശേഖരണ കേന്ദ്രത്തിൽ നിന്ന് വളരെ അകലെയായിരുന്നു. | The phone was too far away from the waste collection center. |
| This collection point is marked closed. **✱** | ഈ മാലിന്യ ശേഖരണ കേന്ദ്രം അടച്ചിരിക്കുന്നു എന്ന് രേഖപ്പെടുത്തിയിരിക്കുന്നു. | It is noted that this waste collection center is closed. |
| Receipt photo read | രസീത് ഫോട്ടോ വായിച്ചു | The receipt photo was read. |
| Photo kept, but it did not look like a receipt. | ഫോട്ടോ സൂക്ഷിച്ചു, പക്ഷേ അത് രസീത് പോലെ തോന്നിയില്ല. | The photo was kept, but it did not look like a receipt. |
| Finding location **✱** | ഫോണിന്റെ ലൊക്കേഷൻ തിരയുന്നു.. | Searching for the phone's location... |
| Location known **✱** | ഫോൺ ലൊക്കേഷൻ കണ്ടെത്തി | Phone location found. |
| Location off **✱** | ഫോൺ ലൊക്കേഷൻ ഓഫാണ് | Phone location is off. |
| Nearest open point **✱** | അടുത്തുള്ള തുറന്ന മാലിന്യ ശേഖരണ കേന്ദ്രം | Nearest open waste collection point. |
| The microphone is blocked | മൈക്രോഫോൺ തടസ്സപ്പെട്ടിരിക്കുന്നു | Microphone is blocked. |
| Allow the microphone for this site in your browser settings, or type instead. | നിങ്ങളുടെ ബ്രൗസർ ക്രമീകരണങ്ങളിൽ ഈ സൈറ്റിനായി മൈക്രോഫോൺ അനുവദിക്കുക, അല്ലെങ്കിൽ പകരം ടൈപ്പ് ചെയ്യുക. | Please allow microphone for this site in your browser settings, or type instead. |
| This browser cannot record here | ഈ ബ്രൗസറിന് ഇവിടെ റെക്കോർഡ് ചെയ്യാൻ കഴിയില്ല | This browser cannot record here. |
| Type what you emptied and where instead. **✱** | പകരം, നിങ്ങൾ ഒഴിഞ്ഞ മാലിന്യത്തിന്റെ തരം, എവിടെ നിന്ന് ഒഴിഞ്ഞു എന്ന് ടൈപ്പ് ചെയ്യുക. | Instead, type the type of waste you emptied and where you emptied it. |
| Location is off **✱** | ഫോൺ ലൊക്കേഷൻ ഓഫാണ് | Phone location is off. |
| Entries will be saved as Declared. Turn on location for this site to prove where you were. **✱** | എൻട്രികൾ ക്രൂവിന്റെ പ്രഖ്യാപനങ്ങളായി സംരക്ഷിക്കപ്പെടും. നിങ്ങൾ എവിടെയായിരുന്നു എന്ന് തെളിയിക്കാൻ ഈ സൈറ്റിനായി ഫോൺ ലൊക്കേഷൻ ഓൺ ചെയ്യുക. | Entries will be saved as crew declarations. Turn on phone location for this site to prove where you were. |
| No network | നെറ്റ്‌വർക്കില്ല | No network. |
| Nothing was sent. Check your mobile data and try again. | ഒന്നും അയച്ചില്ല. നിങ്ങളുടെ മൊബൈൽ ഡാറ്റ പരിശോധിച്ച ശേഷം വീണ്ടും ശ്രമിക്കുക. | Nothing sent. Check your mobile data and try again. |
| Not saved | സേവ് ചെയ്തിട്ടില്ല | Not saved. |
| Say what you emptied, how much, and where. **✱** | നിങ്ങൾ ഒഴിഞ്ഞ മാലിന്യത്തിന്റെ തരവും അളവും, അത് ഒഴിഞ്ഞ സ്ഥലവും പറയുക. | Please specify the type and quantity of waste you emptied, as well as the location where it was emptied. |
| That recording could not be used | ആ റെക്കോർഡിംഗ് ഉപയോഗിക്കാൻ കഴിഞ്ഞില്ല | The recording could not be used. |
| The language service did not answer | ഭാഷാ സേവനം പ്രതികരിച്ചില്ല | Language service did not respond. |
| Nothing was saved. Try again in a moment. | ഒന്നും സേവ് ചെയ്തിട്ടില്ല. ഒരല്പം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക. | Nothing saved. Try again after a while. |
| Could not save | സേവ് ചെയ്യാൻ കഴിഞ്ഞില്ല | Could not save. |
| Could not change the amount **✱** | മാലിന്യത്തിന്റെ അളവ് മാറ്റാൻ കഴിഞ്ഞില്ല | The amount of waste could not be changed. |
| Try again | വീണ്ടും ശ്രമിക്കുക | Try again. |
| Type instead | പകരം ടൈപ്പ് ചെയ്യുക | Type instead. |
| Dismiss **✱** | ഈ അറിയിപ്പ് അടയ്ക്കുക | Close this notification. |
| This boat is not registered | ഈ ബോട്ട് രജിസ്റ്റർ ചെയ്തിട്ടില്ല | This boat is not registered. |
| Go back and pick your boat from the list. | തിരികെ പോയി ലിസ്റ്റിൽ നിന്ന് നിങ്ങളുടെ ബോട്ട് തിരഞ്ഞെടുക്കുക. | Go back and select your boat from the list. |
| Could not load your boat | നിങ്ങളുടെ ബോട്ട് ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല | Your boat could not be loaded. |
| Pick your boat | നിങ്ങളുടെ ബോട്ട് തിരഞ്ഞെടുക്കുക | Select your boat. |
| Tap, then say what you emptied or handed over, and where (legacy) | ടാപ്പ് ചെയ്ത് സംസാരിക്കുക | Tap to speak |
| Tap again to stop (legacy) | നിർത്താൻ വീണ്ടും ടാപ്പ് ചെയ്യുക | Tap again to stop |
| Working (legacy) | കാത്തിരിക്കുക | Wait |

The table includes catalogue entries that currently render in English only. On the crew page these include **Save amount**, **Dismiss**, **Nearest open point** and recording control labels. The three legacy rows are from the fallback crew page and its script.

## Boat record

| English | Malayalam | Sarvam back-translation |
| --- | --- | --- |
| This boat emptied its sewage tank at a treatment plant, and the crew’s phone was there when they logged it. **✱** | ഈ ബോട്ട് ഒരു ശുദ്ധീകരണ പ്ലാന്റിൽ അതിന്റെ മലിനജല ടാങ്ക് ഒഴിഞ്ഞു. ലോഗ് എൻട്രി സമർപ്പിച്ച സമയത്ത് ജീവനക്കാരുടെ ഫോൺ അവിടെ ഉണ്ടായിരുന്നു. | This boat emptied its sewage tank at a treatment plant. The staff's phone was there at the time the log entry was submitted. |
| The crew says they emptied the sewage tank, but nothing confirms where the waste went. **✱** | ജീവനക്കാർ പറയുന്നു, "ഞങ്ങൾ മലിനജല ടാങ്ക് ഒഴിഞ്ഞു." മാലിന്യം എവിടെ പോയെന്ന് സ്ഥിരീകരിക്കുന്നില്ല. | The staff says, "We emptied the sewage tank." It is not confirmed where the waste went. |
| This boat has not logged emptying its sewage tank in the last 90 days. **✱** | കഴിഞ്ഞ 90 ദിവസത്തിനുള്ളിൽ, ബോട്ട് അതിന്റെ മലിനജല ടാങ്ക് ഒഴിഞ്ഞതിനെക്കുറിച്ച് ലോഗ് എൻട്രി ചെയ്തിട്ടില്ല. | There is no log entry for the boat emptying its sewage tank within the last 90 days. |
| Verified | സ്ഥിരീകരിച്ചു | Confirmed |
| Declared only **✱** | ക്രൂവിന്റെ പ്രഖ്യാപനം മാത്രം | Crew's declaration only |
| Overdue **✱** | സമയപരിധി കഴിഞ്ഞു | Deadline expired |
| Public waste record | പൊതു മാലിന്യ രേഖ | Public waste record |
| Registration | രജിസ്ട്രേഷൻ | Registration |
| Sewage last emptied | അവസാനമായി മലിനജലം ഒഴിഞ്ഞത് | Last time the sewage was emptied |
| Where | എവിടെ | Where |
| Proof | തെളിവ് | Proof |
| Days left before overdue **✱** | സമയപരിധി അവസാനിക്കാൻ ദിവസങ്ങൾ ബാക്കി | Days are left for the deadline to expire. |
| Waste log | മാലിന്യ ലോഗ് | Waste log |
| Sewage tank emptied | മലിനജല ടാങ്ക് ഒഴിഞ്ഞു | Sewage tank emptied |
| Solid waste handed over | ഖരമാലിന്യം കൈമാറി | Solid waste handed over |
| Used engine oil handed over | ഉപയോഗിച്ച എഞ്ചിൻ ഓയിൽ കൈമാറി | Used engine oil handed over |
| Receipt | രസീത് | Receipt |
| Location **✱** | ലൊക്കേഷനിൽ നിന്നുള്ള തെളിവ് | Evidence from the location. |
| Declared **✱** | ക്രൂവിന്റെ പ്രഖ്യാപനം | Crew's declaration |
| Quantity corrected **✱** | മാലിന്യത്തിന്റെ അളവ് തിരുത്തിയിട്ടുണ്ട് | The amount of waste has been corrected. |
| Receipt photo | രസീത് ഫോട്ടോ | Receipt Photo |
| Record intact | രേഖ കേടുകൂടാതെയിരിക്കുന്നു | Record is intact |
| Record altered | രേഖയിൽ മാറ്റം വരുത്തി | Record has been altered |
| Report dumping **✱** | വെള്ളത്തിലേക്ക് മാലിന്യം തള്ളിയതിനെക്കുറിച്ച് റിപ്പോർട്ട് ചെയ്യുക | Report on the dumping of waste into the water. |
| Did you see waste going into the water? | മാലിന്യം വെള്ളത്തിലേക്ക് പോകുന്നത് നിങ്ങൾ കണ്ടോ? | Did you see the waste going into the water? |
| Send report | റിപ്പോർട്ട് അയയ്ക്കുക | Send report |
| Report sent | റിപ്പോർട്ട് അയച്ചു | Report sent |
| How to read the seal | സീൽ എങ്ങനെ വായിക്കാം | How to read the seal |
| Boat not found | ബോട്ട് കണ്ടെത്തിയില്ല | Boat not found |
| Go to the start | ആരംഭത്തിലേക്ക് പോകുക | Go to Start |

On the boat record, **Registration** currently renders in English only. The overdue seal sentence uses the default 90-day window.

## Landing and sign-in

| English | Malayalam | Sarvam back-translation |
| --- | --- | --- |
| Proof of where houseboat waste went | ഹൗസ് ബോട്ട് മാലിന്യം എവിടെയെല്ലാം പോയി എന്നതിന്റെ തെളിവ് | Proof of where the houseboat waste went |
| How it works | ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു | How it works |
| Say it | പറയുക | Say |
| The crew says in Malayalam which waste they handed over, and where. **✱** | മലയാളത്തിൽ, ജീവനക്കാർ ഏത് തരത്തിലുള്ള മാലിന്യമാണ് കൈമാറിയതെന്നും എവിടെയാണ് കൈമാറിയതെന്നും പറയുന്നു. | In Malayalam, it states what type of waste the employees handed over and where they handed it over. |
| Prove it | തെളിയിക്കുക | Prove |
| The phone’s location and a photo of the receipt back up the entry. | ഫോണിന്റെ ലൊക്കേഷനും രസീത് ഫോട്ടോയും എൻട്രിയെ പിന്തുണയ്ക്കുന്നു. | The phone's location and receipt photo support the entry. |
| Show it | കാണിക്കുക | Show |
| Tourists and inspectors see the boat’s record, with a seal anyone can read. | വിനോദസഞ്ചാരികളും ഇൻസ്പെക്ടർമാരും ബോട്ടിന്റെ രേഖ കാണുന്നു, ആർക്കും വായിക്കാൻ കഴിയുന്ന ഒരു സീൽ ഇതിലുണ്ട്. | Tourists and inspectors see the boat's record, it has a seal that anyone can read. |
| Choose your door | നിങ്ങളുടെ വാതിൽ തിരഞ്ഞെടുക്കുക | Choose your door |
| Crew | ജീവനക്കാർ | Employees |
| Log a waste handover by voice for your boat. | നിങ്ങളുടെ ബോട്ടിനായി ശബ്ദത്തിലൂടെ മാലിന്യം കൈമാറ്റം ചെയ്തത് രേഖപ്പെടുത്തുക. | Record the transfer of waste for your boat via voice. |
| Inspector | ഇൻസ്പെക്ടർ | Inspector |
| See every boat on one map, most overdue first. **✱** | എല്ലാ ബോട്ടുകളും ഒരൊറ്റ മാപ്പിൽ കാണുക, മാലിന്യം രേഖപ്പെടുത്താനുള്ള സമയപരിധി കഴിഞ്ഞ ബോട്ടുകൾ ആദ്യം കാണുക. | See all boats on a single map, and first see the boats that have exceeded the deadline for recording waste. |
| Guest | അതിഥി | Guest |
| See any boat’s public record. No sign-in needed. | ഏത് ബോട്ടിന്റെയും പൊതു രേഖ കാണുക. സൈൻ-ഇൻ ആവശ്യമില്ല. | View the public record of any boat. No sign-in required. |
| Your boat | നിങ്ങളുടെ ബോട്ട് | Your boat |
| Open the crew page | ജീവനക്കാരുടെ പേജ് തുറക്കുക | Open the staff page |
| Inspector PIN | ഇൻസ്പെക്ടർ പിൻ | Inspector PIN |
| Sign in | സൈൻ ഇൻ ചെയ്യുക | Sign in |
| That PIN is wrong. Check it and try again. | ആ പിൻ നമ്പർ തെറ്റാണ്. അത് പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക. | That PIN number is incorrect. Check it and try again. |
| Verified | സ്ഥിരീകരിച്ചു | Verified |
| Declared only **✱** | ക്രൂവിന്റെ പ്രഖ്യാപനം മാത്രം | Crew's declaration only |
| Overdue **✱** | സമയപരിധി കഴിഞ്ഞു | Deadline expired |

## Inspector dashboard

The table repeats the shared boat-state labels used on this screen. Dashboard proof chips and map callouts currently use English.

| English | Malayalam | Sarvam back-translation |
| --- | --- | --- |
| Inspector dashboard | ഇൻസ്പെക്ടർ ഡാഷ്ബോർഡ് | Inspector Dashboard |
| Boats verified **✱** | സ്ഥിരീകരിച്ച ബോട്ടുകൾ | Confirmed Boats |
| Declared only **✱** | ക്രൂവിന്റെ പ്രഖ്യാപനം മാത്രം | Crew's declaration only |
| Boats overdue **✱** | സമയപരിധി കഴിഞ്ഞ ബോട്ടുകൾ | Boats that have exceeded their time limit |
| Entries today | ഇന്നത്തെ എൻട്രികൾ | Today's entries |
| Open reports **✱** | അവലോകനത്തിനായി കാത്തിരിക്കുന്ന റിപ്പോർട്ടുകൾ | Reports awaiting review |
| Collection points and recent entries **✱** | മാലിന്യ ശേഖരണ കേന്ദ്രങ്ങളും സമീപകാല ലോഗ് എൻട്രികളും | Waste collection points and recent log entries. |
| Boats, longest wait first **✱** | ഏറ്റവും കൂടുതൽ കാലം മുൻപ് മലിനജല ടാങ്ക് ഒഴിഞ്ഞ ബോട്ടുകൾ ആദ്യം ദൃശ്യമാകും | Boats that emptied their sewage tanks the longest time ago will appear first. |
| Live log | ലൈവ് ലോഗ് | Live log |
| Collection points **✱** | മാലിന്യ ശേഖരണ കേന്ദ്രങ്ങൾ | Waste collection centers. |
| Tourist reports | ടൂറിസ്റ്റ് റിപ്പോർട്ടുകൾ | Tourist reports |
| Add boat | ബോട്ട് ചേർക്കുക | Add boat |
| Add collection point **✱** | ഒരു മാലിന്യ ശേഖരണ കേന്ദ്രം ചേർക്കുക | Add a waste collection point. |
| QR codes | QR കോഡുകൾ | QR codes |
| Open now **✱** | നിലവിൽ പ്രവർത്തിക്കുന്നു | Currently operational |
| Closed now **✱** | നിലവിൽ അടച്ചിരിക്കുന്നു | Currently Closed. |
| Chain intact | ചെയിൻ കേടില്ലാതെയിരിക്കുന്നു | Chain is intact |
| Chain broken | ചെയിൻ തകർന്നിരിക്കുന്നു | Chain is broken |
| Crew link | ക്രൂ ലിങ്ക് | Crew link |
| Public record | പൊതു രേഖ | Public record |
| Sign out | സൈൻ ഔട്ട് ചെയ്യുക | Sign out |
| Verified | സ്ഥിരീകരിച്ചു | Verified |
| Declared only **✱** | ക്രൂവിന്റെ പ്രഖ്യാപനം മാത്രം | Crew's declaration only |
| Overdue **✱** | സമയപരിധി കഴിഞ്ഞു | Deadline expired |

## Remaining questions

- The inspector sign-in description now refers to the waste logging deadline. Sarvam’s back-translation still flattens the ranking within the overdue boats.
- In the server’s retry reply, “where it is” may sound like a question about where the waste is now. The unavailable-point samples can sound as if a particular centre is unavailable. They are meant to say that no suitable centre is available.
- Ask a native speaker to check whether the proof labels sound natural in a boat log, especially the crew declaration and the location evidence label. The dashboard’s open and closed labels came back as states. A native reader can check whether they clearly mean the point is accepting waste or is closed.
- The legacy prompt’s Malayalam says “Tap to speak,” and its working label says “Wait.” These are shorter than the accompanying English. The fallback lives outside the React translation catalogues.

## Before and after

The English in the first column is the catalogue label. **Back** shows Sarvam’s English output. **Source** shows the contextual English sent for the replacement. The locale generators use the on-screen English as their default input, so the selected machine output is stored directly in the four Malayalam JSON files.

| English | Before | After |
| --- | --- | --- |
| Say what you emptied, how much, and where<br>crew.introTitle | നിങ്ങൾ എന്താണ് ഒഴിഞ്ഞതെന്ന് പറയുക, എത്രയാണെന്നും എവിടെയാണെന്നും പറയുക<br>**Back** Tell me what you emptied, how much, and where. | നിങ്ങൾ ഒഴിഞ്ഞ മാലിന്യത്തിന്റെ തരവും അളവും, അത് ഒഴിഞ്ഞ സ്ഥലവും പറയുക<br>**Back** Please specify the type and quantity of waste you emptied, as well as the location where it was emptied.<br>**Source** Tell us the type and amount of waste you emptied, and the place where you emptied it. |
| We emptied 800 litres from the toilet tank at Kumarakom STP.<br>crew.introExample | ഞങ്ങൾ കുമരകം എസ്.ടി.പിയിലെ ടോയ്‌ലറ്റ് ടാങ്കിൽ നിന്ന് 800 ലിറ്റർ ഒഴിഞ്ഞു.<br>**Back** We emptied 800 liters from the toilet tank at Kumarakom STP. | ഞങ്ങൾ കുമരകം എസ്.ടി.പിയിലെ ടോയ്‌ലറ്റ് ടാങ്കിൽ നിന്ന് 800 ലിറ്റർ മലിനജലം ഒഴുക്കിക്കളഞ്ഞു.<br>**Back** We drained 800 liters of sewage from the toilet tank at the Kumarakom STP.<br>**Source** We drained 800 litres of sewage from the toilet tank at Kumarakom STP. |
| Speak<br>crew.speak | സംസാരിക്കുക<br>**Back** Speaking | മൈക്രോഫോണിൽ സംസാരിക്കുക<br>**Back** Speak into the microphone.<br>**Source** Speak into the microphone. |
| Type what you emptied and where<br>crew.typeLabel | നിങ്ങൾ എന്താണ് ഒഴിഞ്ഞതെന്നും എവിടെയാണെന്നും ടൈപ്പ് ചെയ്യുക<br>**Back** Type what you emptied and where. | നിങ്ങൾ ഏത് തരത്തിലുള്ള മാലിന്യമാണ് ഒഴുക്കിക്കളഞ്ഞതെന്നും എവിടെയാണ് ഒഴുക്കിക്കളഞ്ഞതെന്നും ടൈപ്പ് ചെയ്യുക<br>**Back** Type what kind of waste you emptied and where you emptied it.<br>**Source** Type what kind of waste you emptied and where you did it. |
| Remove photo<br>crew.photoRemove | ഫോട്ടോ നീക്കം ചെയ്യുക<br>**Back** Delete photo | അറ്റാച്ച് ചെയ്ത ഫോട്ടോ നീക്കം ചെയ്യുക<br>**Back** Remove the attached photo.<br>**Source** Remove the attached photo. |
| Take the photo again.<br>crew.photoFailBody | വീണ്ടും ഫോട്ടോ എടുക്കുക.<br>**Back** Take a photo again. | ഫോട്ടോ വീണ്ടും എടുക്കുക.<br>**Back** Retake the photo.<br>**Source** Retake the photo. |
| Waste<br>crew.waste | മാലിന്യം<br>**Back** Garbage | മാലിന്യ വസ്തു<br>**Back** Waste material<br>**Source** Waste material |
| Quantity<br>crew.quantity | എണ്ണം<br>**Back** Count | മാലിന്യത്തിന്റെ അളവ്<br>**Back** Amount of waste<br>**Source** Quantity of waste |
| Save amount<br>crew.fixSave | തുക സംരക്ഷിക്കുക<br>**Back** Save the amount | മാലിന്യത്തിന്റെ അളവ് സേവ് ചെയ്യുക<br>**Back** Save the amount of waste.<br>**Source** Save the waste quantity. |
| Declared<br>crew.levelDeclared | പ്രഖ്യാപിച്ചു<br>**Back** Announced | ക്രൂവിന്റെ പ്രഖ്യാപനം<br>**Back** Crew's declaration<br>**Source** Crew declaration |
| Location<br>crew.levelLocation | സ്ഥലം<br>**Back** Location | ലൊക്കേഷനിൽ നിന്നുള്ള തെളിവ്<br>**Back** Evidence from the location.<br>**Source** Proof from location |
| The phone was at an open collection point that takes this waste.<br>crew.reasonLocation | ഈ മാലിന്യം സ്വീകരിക്കുന്ന തുറന്ന ശേഖരണ കേന്ദ്രത്തിലായിരുന്നു ഫോൺ.<br>**Back** The phone was at the open collection center that receives this waste. | ഫോൺ ഒരു മാലിന്യ ശേഖരണ കേന്ദ്രത്തിലായിരുന്നു. കേന്ദ്രം തുറന്നിട്ടുണ്ട്, ഈ മാലിന്യം സ്വീകരിക്കുന്നു.<br>**Back** The phone was at a waste collection center. The center is open and accepting this waste.<br>**Source** The phone was at a waste collection centre. The centre was open and accepts this waste. |
| The phone was at the collection point, and the photo was read as a receipt.<br>crew.reasonReceipt | ഫോൺ ശേഖരണ കേന്ദ്രത്തിലുണ്ടായിരുന്നു, ഫോട്ടോ ഒരു രസീതായി വായിച്ചു.<br>**Back** The phone was at the collection center, and the photo was read as a receipt. | ഫോൺ മാലിന്യ ശേഖരണ കേന്ദ്രത്തിലായിരുന്നു, ഫോട്ടോ ഒരു രസീതായി വായിച്ചു.<br>**Back** The phone was at the waste collection center, and the photo was read as a receipt.<br>**Source** The phone was at the waste collection centre, and the photo was read as a receipt. |
| The phone’s location was not known, so only your word backs this entry.<br>crew.reasonNoLocation | ഫോണിന്റെ സ്ഥാനം അറിവായിരുന്നില്ല, അതിനാൽ നിങ്ങളുടെ വാക്ക് മാത്രമേ ഈ എൻട്രിയെ പിന്തുണയ്ക്കുകയുള്ളൂ.<br>**Back** The phone's location was not known, so only your word will support this entry. | ഫോൺ ലൊക്കേഷൻ അജ്ഞാതമായിരുന്നു, അതിനാൽ ഈ എൻട്രിക്കുള്ള ഏക തെളിവ് ക്രൂവിന്റെ പ്രഖ്യാപനമാണ്.<br>**Back** The phone location was unknown, so the only evidence for this entry is the crew's declaration.<br>**Source** The phone location was unknown, so the crew declaration is the only evidence for this entry. |
| No collection point takes this kind of waste.<br>crew.reasonNoFacility | ഇത്തരത്തിലുള്ള മാലിന്യം ശേഖരിക്കുന്ന സ്ഥലങ്ങളില്ല.<br>**Back** There are no places to collect this type of waste. | ഈ തരത്തിലുള്ള മാലിന്യം സ്വീകരിക്കുന്ന മാലിന്യ ശേഖരണ കേന്ദ്രം ലഭ്യമല്ല.<br>**Back** A waste collection center that accepts this type of waste is not available.<br>**Source** There is no waste collection centre that accepts this type of waste. |
| The phone was too far from the collection point.<br>crew.reasonTooFar | ഫോൺ ശേഖരിക്കുന്ന സ്ഥലത്ത് നിന്ന് വളരെ അകലെയായിരുന്നു.<br>**Back** The phone was far away from the collection place. | ഫോൺ മാലിന്യ ശേഖരണ കേന്ദ്രത്തിൽ നിന്ന് വളരെ അകലെയായിരുന്നു.<br>**Back** The phone was too far away from the waste collection center.<br>**Source** The phone was too far away from the waste collection centre. |
| This collection point is marked closed.<br>crew.reasonClosed | ഈ ശേഖരണ കേന്ദ്രം അടച്ചിരിക്കുന്നു എന്ന് രേഖപ്പെടുത്തിയിരിക്കുന്നു.<br>**Back** It is recorded that this collection center is closed. | ഈ മാലിന്യ ശേഖരണ കേന്ദ്രം അടച്ചിരിക്കുന്നു എന്ന് രേഖപ്പെടുത്തിയിരിക്കുന്നു.<br>**Back** It is noted that this waste collection center is closed.<br>**Source** This waste collection centre is marked as closed. |
| Finding location<br>crew.locFinding | സ്ഥലം കണ്ടെത്തുന്നു.<br>**Back** Finding the location. | ഫോണിന്റെ ലൊക്കേഷൻ തിരയുന്നു...<br>**Back** Searching for the phone's location...<br>**Source** Looking for the phone’s location… |
| Location known<br>crew.locReady | സ്ഥലം അറിയാം.<br>**Back** The location is known. | ഫോൺ ലൊക്കേഷൻ കണ്ടെത്തി<br>**Back** Phone location found.<br>**Source** Phone location detected |
| Location off<br>crew.locOff | സ്ഥലം ഓഫാണ്.<br>**Back** The location is off. | ഫോൺ ലൊക്കേഷൻ ഓഫാണ്<br>**Back** Phone location is off.<br>**Source** Phone location is turned off. |
| Nearest open point<br>crew.nearestOpen | ഏറ്റവും അടുത്തുള്ള തുറന്ന സ്ഥലം.<br>**Back** Nearest open space. | അടുത്തുള്ള തുറന്ന മാലിന്യ ശേഖരണ കേന്ദ്രം<br>**Back** Nearest open waste collection point.<br>**Source** Nearest open waste collection centre |
| Type what you emptied and where instead.<br>crew.micMissingBody | പകരം നിങ്ങൾ എന്താണ് ഒഴിഞ്ഞതെന്നും എവിടെയാണെന്നും ടൈപ്പ് ചെയ്യുക.<br>**Back** Instead, type what you left and where. | പകരം, നിങ്ങൾ ഒഴിഞ്ഞ മാലിന്യത്തിന്റെ തരം, എവിടെ നിന്ന് ഒഴിഞ്ഞു എന്ന് ടൈപ്പ് ചെയ്യുക.<br>**Back** Instead, type the type of waste you emptied and where you emptied it.<br>**Source** Instead, type the kind of waste you emptied and where you emptied it. |
| Location is off<br>crew.locDeniedTitle | സ്ഥലം ഓഫാണ്.<br>**Back** Location is off. | ഫോൺ ലൊക്കേഷൻ ഓഫാണ്<br>**Back** Phone location is off.<br>**Source** Phone location is turned off. |
| Entries will be saved as Declared. Turn on location for this site to prove where you were.<br>crew.locDeniedBody | എൻട്രികൾ ഡിക്ലയേർഡ് ആയി സേവ് ചെയ്യും. നിങ്ങൾ എവിടെയായിരുന്നുവെന്ന് തെളിയിക്കാൻ ഈ സൈറ്റിനായി ലൊക്കേഷൻ ഓൺ ചെയ്യുക.<br>**Back** Entries will be saved as declared. Turn on location for this site to prove where you were. | എൻട്രികൾ ക്രൂവിന്റെ പ്രഖ്യാപനങ്ങളായി സംരക്ഷിക്കപ്പെടും. നിങ്ങൾ എവിടെയായിരുന്നു എന്ന് തെളിയിക്കാൻ ഈ സൈറ്റിനായി ഫോൺ ലൊക്കേഷൻ ഓൺ ചെയ്യുക.<br>**Back** Entries will be saved as crew declarations. Turn on phone location for this site to prove where you were.<br>**Source** Entries will be saved as crew declarations. Turn on phone location for this site to prove where you were. |
| Say what you emptied, how much, and where.<br>crew.notUnderstoodBody | നിങ്ങൾ എന്താണ് ഒഴിഞ്ഞതെന്നും എത്രയാണെന്നും എവിടെയാണെന്നും പറയുക.<br>**Back** Tell us what you left, how much, and where. | നിങ്ങൾ ഒഴിഞ്ഞ മാലിന്യത്തിന്റെ തരവും അളവും, അത് ഒഴിഞ്ഞ സ്ഥലവും പറയുക.<br>**Back** Please specify the type and quantity of waste you emptied, as well as the location where it was emptied.<br>**Source** Tell us the type and amount of waste you emptied, and the place where you emptied it. |
| Could not change the amount<br>crew.fixFailed | തുക മാറ്റാൻ കഴിഞ്ഞില്ല.<br>**Back** Amount could not be transferred. | മാലിന്യത്തിന്റെ അളവ് മാറ്റാൻ കഴിഞ്ഞില്ല<br>**Back** The amount of waste could not be changed.<br>**Source** Could not change the waste quantity. |
| Dismiss<br>crew.dismiss | പുറന്തള്ളുക.<br>**Back** Eject. | ഈ അറിയിപ്പ് അടയ്ക്കുക<br>**Back** Close this notification.<br>**Source** Close this notice. |
| Declared only<br>boat.sealDeclared | പ്രഖ്യാപിച്ചത് മാത്രം<br>**Back** Only declared | ക്രൂവിന്റെ പ്രഖ്യാപനം മാത്രം<br>**Back** Crew's declaration only<br>**Source** Crew declaration only |
| Overdue<br>boat.sealOverdue | വൈകിയത്<br>**Back** Delayed | സമയപരിധി കഴിഞ്ഞു<br>**Back** Deadline expired<br>**Source** Deadline passed |
| This boat emptied its sewage tank at a treatment plant, and the crew’s phone was there when they logged it.<br>boat.sentenceVerified | ഈ ബോട്ട് അതിന്റെ മലിനജല ടാങ്ക് ഒരു ട്രീറ്റ്മെന്റ് പ്ലാന്റിൽ ഒഴിഞ്ഞു, ജീവനക്കാർ അത് ലോഗ് ചെയ്തപ്പോൾ അവരുടെ ഫോൺ അവിടെ ഉണ്ടായിരുന്നു.<br>**Back** This boat emptied its sewage tank into a treatment plant, and the staff was there when they logged it. | ഈ ബോട്ട് ഒരു ശുദ്ധീകരണ പ്ലാന്റിൽ അതിന്റെ മലിനജല ടാങ്ക് ഒഴിഞ്ഞു. ലോഗ് എൻട്രി സമർപ്പിച്ച സമയത്ത് ജീവനക്കാരുടെ ഫോൺ അവിടെ ഉണ്ടായിരുന്നു.<br>**Back** This boat emptied its sewage tank at a treatment plant. The staff's phone was there at the time the log entry was submitted.<br>**Source** This boat emptied its sewage tank at a treatment plant. The crew’s phone was there at the time they submitted the log entry. |
| The crew says they emptied the sewage tank, but nothing confirms where the waste went.<br>boat.sentenceDeclared | ജീവനക്കാർ മലിനജല ടാങ്ക് ഒഴിഞ്ഞുവെന്ന് പറയുന്നു, പക്ഷേ മാലിന്യം എവിടെ പോയെന്ന് ഒന്നും സ്ഥിരീകരിക്കുന്നില്ല.<br>**Back** The staff says the sewage tank is empty, but nothing is confirmed about where the waste went. | ജീവനക്കാർ പറയുന്നു, "ഞങ്ങൾ മലിനജല ടാങ്ക് ഒഴിഞ്ഞു." മാലിന്യം എവിടെ പോയെന്ന് സ്ഥിരീകരിക്കുന്നില്ല.<br>**Back** The staff says, "We emptied the sewage tank." It is not confirmed where the waste went.<br>**Source** The crew says, “We emptied the sewage tank.” There is no confirmation of where the waste went. |
| This boat has not logged emptying its sewage tank in the last 90 days.<br>boat.sentenceOverdue | കഴിഞ്ഞ 90 ദിവസത്തിനുള്ളിൽ ഈ ബോട്ട് അതിന്റെ മലിനജല ടാങ്ക് ഒഴിഞ്ഞതായി രേഖപ്പെടുത്തിയിട്ടില്ല.<br>**Back** This boat has not been recorded as having emptied its sewage tank in the last 90 days. | കഴിഞ്ഞ 90 ദിവസത്തിനുള്ളിൽ, ബോട്ട് അതിന്റെ മലിനജല ടാങ്ക് ഒഴിഞ്ഞതിനെക്കുറിച്ച് ലോഗ് എൻട്രി ചെയ്തിട്ടില്ല.<br>**Back** There is no log entry for the boat emptying its sewage tank within the last 90 days.<br>**Source** In the past 90 days, the boat has made no log entry for emptying its sewage tank. |
| Days left before overdue<br>boat.daysLeft | വൈകാൻ എത്ര ദിവസമുണ്ട്<br>**Back** How many days are there to delay | സമയപരിധി അവസാനിക്കാൻ ദിവസങ്ങൾ ബാക്കി<br>**Back** Days are left for the deadline to expire.<br>**Source** Days remaining until the deadline |
| Location<br>boat.levelLocation | സ്ഥലം<br>**Back** Location | ലൊക്കേഷനിൽ നിന്നുള്ള തെളിവ്<br>**Back** Evidence from the location.<br>**Source** Proof from location |
| Declared<br>boat.levelDeclared | പ്രഖ്യാപിച്ചത്<br>**Back** Declared | ക്രൂവിന്റെ പ്രഖ്യാപനം<br>**Back** Crew's declaration<br>**Source** Crew declaration |
| Quantity corrected<br>boat.corrected | എത്ര അളവ് തിരുത്തി<br>**Back** How much quantity is corrected | മാലിന്യത്തിന്റെ അളവ് തിരുത്തിയിട്ടുണ്ട്<br>**Back** The amount of waste has been corrected.<br>**Source** The waste quantity was corrected. |
| Report dumping<br>boat.reportTitle | ഡമ്പിംഗ് റിപ്പോർട്ട് ചെയ്തു<br>**Back** Dumping reported | വെള്ളത്തിലേക്ക് മാലിന്യം തള്ളിയതിനെക്കുറിച്ച് റിപ്പോർട്ട് ചെയ്യുക<br>**Back** Report on the dumping of waste into the water.<br>**Source** Report the dumping of waste into the water. |
| The crew says in Malayalam which waste they handed over, and where.<br>landing.sayBody | ഏത് മാലിന്യമാണ് കൈമാറിയതെന്നും എവിടെയാണെന്നും ജീവനക്കാർ മലയാളത്തിൽ പറയുന്നു.<br>**Back** Employees say in Malayalam what waste was handed over and where it is. | മലയാളത്തിൽ, ജീവനക്കാർ ഏത് തരത്തിലുള്ള മാലിന്യമാണ് കൈമാറിയതെന്നും എവിടെയാണ് കൈമാറിയതെന്നും പറയുന്നു.<br>**Back** In Malayalam, it states what type of waste the employees handed over and where they handed it over.<br>**Source** In Malayalam, the crew tells us the type of waste they handed over and where they handed it over. |
| See every boat on one map, most overdue first.<br>landing.inspectorBody | ഓരോ ബോട്ടും ഒരു മാപ്പിൽ കാണുക, ഏറ്റവും കൂടുതൽ കുടിശ്ശികയുള്ളവ ആദ്യം കാണുക.<br>**Back** View each boat on a map, with the most outstanding dues listed first. | എല്ലാ ബോട്ടുകളും ഒരൊറ്റ മാപ്പിൽ കാണുക, മാലിന്യം രേഖപ്പെടുത്താനുള്ള സമയപരിധി കഴിഞ്ഞ ബോട്ടുകൾ ആദ്യം കാണുക.<br>**Back** See all boats on a single map, and first see the boats that have exceeded the deadline for recording waste.<br>**Source** See all the boats on one map, with the boats furthest past their waste logging deadline first. |
| Declared only<br>landing.declared | പ്രഖ്യാപിച്ചത് മാത്രം<br>**Back** Only announced | ക്രൂവിന്റെ പ്രഖ്യാപനം മാത്രം<br>**Back** Crew's declaration only<br>**Source** Crew declaration only |
| Overdue<br>landing.overdue | കുടിശ്ശിക<br>**Back** Dues | സമയപരിധി കഴിഞ്ഞു<br>**Back** Deadline expired<br>**Source** Deadline passed |
| Boats verified<br>dashboard.statVerified | പരിശോധിച്ച ബോട്ടുകൾ<br>**Back** Boats inspected | സ്ഥിരീകരിച്ച ബോട്ടുകൾ<br>**Back** Confirmed Boats<br>**Source** Verified boats |
| Declared only<br>dashboard.statDeclared | പ്രഖ്യാപിച്ചത് മാത്രം<br>**Back** Only announced | ക്രൂവിന്റെ പ്രഖ്യാപനം മാത്രം<br>**Back** Crew's declaration only<br>**Source** Crew declaration only |
| Boats overdue<br>dashboard.statOverdue | ബോട്ടുകൾ വൈകി<br>**Back** Boats overdue | സമയപരിധി കഴിഞ്ഞ ബോട്ടുകൾ<br>**Back** Boats that have exceeded their time limit<br>**Source** Boats whose deadline has passed |
| Open reports<br>dashboard.statReports | തുറന്ന റിപ്പോർട്ടുകൾ<br>**Back** Open reports | അവലോകനത്തിനായി കാത്തിരിക്കുന്ന റിപ്പോർട്ടുകൾ<br>**Back** Reports awaiting review<br>**Source** Reports awaiting review |
| Collection points and recent entries<br>dashboard.mapTitle | ശേഖരണ പോയിന്റുകളും സമീപകാല എൻട്രികളും<br>**Back** Collection points and recent entries | മാലിന്യ ശേഖരണ കേന്ദ്രങ്ങളും സമീപകാല ലോഗ് എൻട്രികളും<br>**Back** Waste collection points and recent log entries.<br>**Source** Waste collection centers and recent log entries |
| Boats, longest wait first<br>dashboard.boatsTitle | ഏറ്റവും കൂടുതൽ കാത്തിരിക്കുന്ന ബോട്ടുകൾ ആദ്യം<br>**Back** Most-awaited boats first | ഏറ്റവും കൂടുതൽ കാലം മുൻപ് മലിനജല ടാങ്ക് ഒഴിഞ്ഞ ബോട്ടുകൾ ആദ്യം ദൃശ്യമാകും<br>**Back** Boats that emptied their sewage tanks the longest time ago will appear first.<br>**Source** Boats that last emptied the sewage tank longest ago appear first. |
| Collection points<br>dashboard.pointsTitle | ശേഖരണ പോയിന്റുകൾ<br>**Back** Collection points | മാലിന്യ ശേഖരണ കേന്ദ്രങ്ങൾ<br>**Back** Waste collection centers.<br>**Source** Waste collection centers |
| Add collection point<br>dashboard.addPoint | ശേഖരണ പോയിന്റ് ചേർക്കുക<br>**Back** Add collection point | ഒരു മാലിന്യ ശേഖരണ കേന്ദ്രം ചേർക്കുക<br>**Back** Add a waste collection point.<br>**Source** Add a waste collection center |
| Open now<br>dashboard.open | ഇപ്പോൾ തുറന്നു<br>**Back** Currently open | നിലവിൽ പ്രവർത്തിക്കുന്നു<br>**Back** Currently operational<br>**Source** Currently operating |
| Closed now<br>dashboard.closed | ഇപ്പോൾ അടച്ചിരിക്കുന്നു<br>**Back** Currently closed | നിലവിൽ അടച്ചിരിക്കുന്നു<br>**Back** Currently Closed.<br>**Source** Closed at present |
