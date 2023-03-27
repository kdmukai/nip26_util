

/************************* Nostr Private Key *************************/
var pk_slide_open = null;
function clearPKDisplayFields() {
    document.getElementById("pk_nsec").value = "";
    document.getElementById("pk_hex").value = "";
    document.getElementById("pubkey_npub").value = "";
    document.getElementById("pubkey_hex").value = "";
}


function createNewPK(keytype) {
    let target = null;
    let data = new FormData();
    data.append("type", keytype);

    clearPKDisplayFields();

    if (keytype == "bip39_12") {
        data.append("mnemonic_length", 12);
        target = document.getElementById("bip39_mnemonic_container")
    } else if (keytype == "bip39_24") {
        target = data.append("mnemonic_length", 24);
        target = document.getElementById("bip39_mnemonic_container")
    }

    // Close an open option, if any
    if ((pk_slide_open !== null && target === null) || (pk_slide_open !== null && target !== null && pk_slide_open.id != target.id)) {
        slideUp(pk_slide_open);
        pk_slide_open = null;
    }
    
    if (target !== null && pk_slide_open === null) {
        slideDown(target);
        pk_slide_open = target;
    }

    fetch(
        "/key/create",
        {
            method: 'POST',
            body: data
        }
    )
    .then(response => response.json())
    .then(result => {
        if (keytype.startsWith("bip39")) {
            document.getElementById("bip39_mnemonic").value = result.mnemonic;
        } else {
            document.getElementById("bip39_mnemonic").value = "";
        }
        document.getElementById("pk_nsec").value = result.pk_nsec;
        document.getElementById("pk_hex").value = result.pk_hex;
        document.getElementById("pubkey_npub").value = result.pubkey_npub;
        document.getElementById("pubkey_hex").value = result.pubkey_hex;
    })
}



function prepareLoadPK(keytype) {
    clearPKDisplayFields();

    if (keytype == "existing") {
        target = document.getElementById("input_existing_container");
    } else if (keytype == "bip39") {
        target = document.getElementById("input_mnemonic_container");
    } else if (keytype == "pubkey") {
        target = document.getElementById("input_pubkey_container");
    }

    // Close an open option, if any
    if (pk_slide_open !== null && pk_slide_open.id != target.id) {
        slideUp(pk_slide_open);
        pk_slide_open = null;
    }
    
    if (pk_slide_open === null) {
        slideDown(target);
        pk_slide_open = target;
    }

}



function loadKey(keytype, targetId) {
    let target = document.getElementById(targetId);

    let data = new FormData();
    data.append("type", keytype);
    data.append("key_data", target.value)

    fetch(
        "/key/load",
        {
            method: 'POST',
            body: data
        }
    )
    .then(response => response.json())
    .then(result => {
        document.getElementById("pk_nsec").value = result.pk_nsec;
        document.getElementById("pk_hex").value = result.pk_hex;
        document.getElementById("pubkey_npub").value = result.pubkey_npub;
        document.getElementById("pubkey_hex").value = result.pubkey_hex;
    })
    .catch(reason => {
        console.log(reason);
    })

}



/************************* NIP-26 *************************/
var curNip26Slide = null;
function prepareLoadNip26(container_id) {
    if (curNip26Slide !== null && curNip26Slide.id != container_id) {
        slideUp(curNip26Slide);
        curNip26Slide = null;
    }

    target = document.getElementById(container_id);
    if(curNip26Slide === null) {
        slideDown(target);
        curNip26Slide = target;
    }
}


function nip26CreateAndSign() {
    let delegator_pk_hex = document.getElementById("pk_hex").value;

    if (delegator_pk_hex == "") {
        showPopupMessage("No delegator private key!<p>Generate or load one at the top.</p>");
        return;
    }

    createDelegationToken(delegator_pk_hex, () => {});
}


function createDelegationToken(delegator_pk_hex, successCallback) {
    let delegatee_pk = document.getElementById("nip26_create_delegatee_pk").value;
    let kinds = [];
    for (let kind of document.getElementsByName('nip26_create_kinds')) {
        if (kind.checked) {
            kinds.push(parseInt(kind.value))
        }
    }

    let valid_from = Math.floor(new Date(document.getElementById("nip26_create_valid_from").value).valueOf() / 1000);
    let valid_until = Math.floor(new Date(document.getElementById("nip26_create_valid_until").value).valueOf() / 1000);

    let data = new FormData();
    if (delegator_pk_hex != null) {
        data.append("delegator_pk_hex", delegator_pk_hex);
    } else {
        data.append("delegator_pubkey_hex", document.getElementById("pubkey_hex").value)
    }
    data.append("delegatee_pk", delegatee_pk);
    data.append("kinds", kinds);
    data.append("valid_from", valid_from);
    data.append("valid_until", valid_until);

    fetch(
        "/nip26/create",
        {
            method: 'POST',
            body: data
        }
    )
    .then(response => response.json())
    .then(result => {
        document.getElementById("nip26_token").value = result.delegation_token;
        document.getElementById("nip26_delegator_npub").value = result.delegator_npub;
        document.getElementById("nip26_delegator_hex").value = result.delegator_hex;
        document.getElementById("nip26_delegatee_npub").value = result.delegatee_npub;
        document.getElementById("nip26_delegatee_pubkey_hex").value = result.delegatee_pubkey_hex;
        document.getElementById("nip26_delegatee_nsec").value = result.delegatee_nsec;
        document.getElementById("nip26_delegatee_privkey_hex").value = result.delegatee_privkey_hex;
        document.getElementById("nip26_kinds").value = result.event_kinds;
        document.getElementById("nip26_valid_from").value = new Date(result.valid_from * 1000).toISOString();
        document.getElementById("nip26_valid_until").value = new Date(result.valid_until * 1000).toISOString();
        document.getElementById("nip26_tag").value = result.delegation_tag;
        document.getElementById("nip26_signature").value = result.signature;

        successCallback();
    })
}


function nip26ExportToQRSigner() {
    createDelegationToken(null, () => {
        let delegation_token = document.getElementById("nip26_token").value;
        showQR(delegation_token, "NIP-26 Delegation Token", 256);
    });
}


function nip26ReadSignedDelegationQR() {
    let targetElement = "nip26_signature";
    parts = 0;
    scanQR("Scan signed delegation QR", (decodedText, decodedResult) => {
        console.log(`!! Code matched = ${decodedText}`, decodedResult);
        document.getElementById(targetElement).value = decodedText;
        hidePopupQR();

        let delegation_tag_el = document.getElementById("nip26_tag");
        delegation_tag_el.value = delegation_tag_el.value.replace(", None]", `, '${decodedText}']`);
    });
}


function nip26Sign(dataSource) {
    let data = new FormData();
    let delegation_token = document.getElementById(dataSource).value;
    let delegator_pk_hex = document.getElementById("pk_hex").value;

    if (delegator_pk_hex == "") {
        showPopupMessage("No delegator private key!<p>Generate or load one at the top.</p>");
        return;
    }

    data.append("delegation_token", delegation_token);
    data.append("delegator_pk_hex", delegator_pk_hex);

    fetch(
        "/nip26/sign",
        {
            method: 'POST',
            body: data
        }
    )
    .then(response => response.json())
    .then(result => {
        document.getElementById("nip26_token").value = delegation_token;
        document.getElementById("nip26_delegator_npub").value = result.delegator_npub;
        document.getElementById("nip26_delegator_hex").value = result.delegator_hex;
        document.getElementById("nip26_delegatee_npub").value = result.delegatee_npub;
        document.getElementById("nip26_delegatee_pubkey_hex").value = result.delegatee_pubkey_hex;
        document.getElementById("nip26_delegatee_nsec").value = result.delegatee_nsec;
        document.getElementById("nip26_delegatee_privkey_hex").value = result.delegatee_privkey_hex;
        document.getElementById("nip26_kinds").value = result.event_kinds;
        document.getElementById("nip26_valid_from").value = new Date(result.valid_from * 1000).toISOString();
        document.getElementById("nip26_valid_until").value = new Date(result.valid_until * 1000).toISOString();
        document.getElementById("nip26_tag").value = result.delegation_tag;
        document.getElementById("nip26_signature").value = result.signature;
    })
}



/************************* EVENTS *************************/
var curEventSlide = null;
function showEvent(container_id) {
    if (curEventSlide !== null && curEventSlide.id != container_id) {
        slideUp(curEventSlide);
        curEventSlide = null;
    }

    target = document.getElementById(container_id);
    if(curEventSlide === null) {
        slideDown(target);
        curEventSlide = target;
    }
}



function eventSign(event_type, dataSource, successCallback) {
    let data = new FormData();
    let pk_hex = "";
    let pubkey_hex = "";

    data.append("type", event_type);

    if (event_type.includes("metadata") || event_type.includes("contacts")) {
        // These inputs are raw json
        data.append("event_data", JSON.stringify(JSON.parse(document.getElementById(dataSource).value)));
    } else {
        data.append("event_data", document.getElementById(dataSource).value);
    }

    if (event_type.includes("nip26")) {
        // Need to pull the delegatee's PK and the delegation tag
        pk_hex = document.getElementById("nip26_delegatee_privkey_hex").value;
        if (pk_hex == "") {
            if (event_type.includes("qr")) {
                pubkey_hex = document.getElementById("nip26_delegatee_pubkey_hex").value;
            } else {
                showPopupMessage("No delegatee private key!<p>Return to the NIP-26 Delegation section.</p>");
                return;
            }
        }

        let delegation_tag = document.getElementById("nip26_tag").value;
        if (delegation_tag == "") {
            showPopupMessage("No delegation tag created/loaded!<p>Return to the NIP-26 Delegation section.</p>");
            return;
        }
        data.append("delegation_tag", delegation_tag)

    } else {
        pk_hex = document.getElementById("pk_hex").value;

        if (pk_hex == "") {
            if (event_type.includes("qr")) {
                pubkey_hex = document.getElementById("pubkey_hex").value;
            } else {
                showPopupMessage("No private key!<p>Generate or load one at the top.</p>");
                return;
            }
        }
    }

    if (pk_hex != "") {
        data.append("pk_hex", pk_hex);
    }
    if (pubkey_hex != "") {
        data.append("pubkey_hex", pubkey_hex)
    }

    fetch(
        "/event/sign",
        {
            method: 'POST',
            body: data
        }
    )
    .then(response => response.json())
    .then(result => {
        document.getElementById("event_json").value = result.event_json;
        document.getElementById("event_note_id").value = result.note_id;
        document.getElementById("event_signature").value = result.signature;

        successCallback();
    })
}


function eventSignViaQRSigner(event_type, dataSource) {
    eventSign(event_type, dataSource, () => {
        let data = document.getElementById("event_json").value;
        console.log(data);
        showQR(data, "Scan raw event json", 256);
    });
}


function eventReadSignedEventQR() {
    let targetElement = "event_signature";
    scanQR("Scan signed event QR", (decodedText, decodedResult) => {
        console.log(`!! Code matched = ${decodedText}`, decodedResult);
        document.getElementById(targetElement).value = decodedText;
        hidePopupQR();

        let event_json_el = document.getElementById("event_json");
        event_json_el.value = event_json_el.value.replace(`"sig": null`, `"sig": "${decodedText}"`);
    });
}


function eventPublish() {
    let data = new FormData();
    let event_json = document.getElementById("event_json").value;

    if (document.getElementById("event_signature").value == "") {
        showPopupMessage("Can't publish until the event is signed");
        return;
    }

    data.append("event_json", event_json);
    data.append("relays", document.getElementById("relays_list").value);

    showLoader();
    fetch(
        "/event/publish",
        {
            method: 'POST',
            body: data
        }
    )
    .then(response => response.json())
    .then(result => {
        hideLoader();
        let kind = result.kind;
        let note_id = result.note_id;
        if (kind == 1) {
            showPopupMessage(`The event has been successfully published!<p>Find it by its note ID in your Nostr client app or see it in Snort <a href="https://snort.social/e/${note_id}" target="_new">here</a></p>`);
        } else {
            showPopupMessage("The event has been successfully published!");
        }
    })
    .catch(reason => {
        console.log(reason);
        alert(reason);
        hideLoader();
    })
}



/************************* QR Codes *************************/
function showQR(data, title, width) {
    console.log(data);
    document.getElementById("popup_qrcode").style.marginLeft = -1 * width/2 + "px";
    var qrcode = new QRCode(document.getElementById("popup_qrcode_container"), {
        text: data,
        width: width,
        height: width,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });

    showPopupQR(title);
}


function showQRFromElement(elementId, title, width) {
    let el = document.getElementById(elementId);
    let data = el.value;
    showQR(data, title, width);
}



let html5QrcodeScanner = null;
function scanQR(title, onScanSuccessCallback) {
    let width = 250;
    document.getElementById("popup_qrcode").style.marginLeft = -1 * width/2 + "px";
    // document.getElementById("popup_qrcode_container");
    html5QrcodeScanner = new Html5QrcodeScanner(
        "popup_qrcode_container",
        { fps: 10, qrbox: {width: width, height: width} },
        /* verbose= */ false);
    html5QrcodeScanner.render(onScanSuccessCallback, onScanFailure);
    
    showPopupQR(title);
}

  
function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning.
    // for example:
    console.warn(`Code scan error = ${error}`);
}


function showPopupQR(title) {
    document.getElementById("popup_grayout").style.display = "block";
    document.getElementById("popup_qrcode").style.display = "block";
    document.getElementById("popup_qrcode_title").innerHTML = title;
}


function hidePopupQR() {
    console.log("hidePopupQR()")
    if (html5QrcodeScanner != null) {
        html5QrcodeScanner.clear();
    }
    document.getElementById("popup_grayout").style.display = "none";
    document.getElementById("popup_qrcode").style.display = "none";
    document.getElementById("popup_qrcode_container").innerHTML = "";
}


function scanQRtoElement(title, targetElement) {
    scanQR(title, (decodedText, decodedResult) => {
        console.log(`!! Code matched = ${decodedText}`, decodedResult);
        document.getElementById(targetElement).value = decodedText;
        hidePopupQR();
    });

}


/************************* Helper utils *************************/
// see: https://codepen.io/ivanwebstudio/pen/OJVzPBL
var speedAnimation = 400;
function slideUp(target, duration=speedAnimation) {
    target.style.transitionProperty = 'height, margin, padding';
    target.style.transitionDuration = duration + 'ms';
    target.style.boxSizing = 'border-box';
    target.style.height = target.offsetHeight + 'px';
    target.offsetHeight;
    target.style.overflow = 'hidden';
    target.style.height = 0;
    target.style.paddingTop = 0;
    target.style.paddingBottom = 0;
    target.style.marginTop = 0;
    target.style.marginBottom = 0;
    window.setTimeout( () => {
      target.style.display = 'none';
      target.style.removeProperty('height');
      target.style.removeProperty('padding-top');
      target.style.removeProperty('padding-bottom');
      target.style.removeProperty('margin-top');
      target.style.removeProperty('margin-bottom');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
      //alert("!");
    }, duration);
}

function slideDown(target, duration=speedAnimation) {
    target.style.removeProperty('display');
    let display = window.getComputedStyle(target).display;

    if (display === 'none')
      display = 'block';

    target.style.display = display;
    let height = target.offsetHeight;
    target.style.overflow = 'hidden';
    target.style.height = 0;
    target.style.paddingTop = 0;
    target.style.paddingBottom = 0;
    target.style.marginTop = 0;
    target.style.marginBottom = 0;
    target.offsetHeight;
    target.style.boxSizing = 'border-box';
    target.style.transitionProperty = "height, margin, padding";
    target.style.transitionDuration = duration + 'ms';
    target.style.height = height + 'px';
    target.style.removeProperty('padding-top');
    target.style.removeProperty('padding-bottom');
    target.style.removeProperty('margin-top');
    target.style.removeProperty('margin-bottom');
    window.setTimeout( () => {
      target.style.removeProperty('height');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
    }, duration);
}

function slideToggle(target, duration=speedAnimation) {
    if (window.getComputedStyle(target).display === 'none') {
      return slideDown(target, duration);
    } else {
      return slideUp(target, duration);
    }
}


function showLoader() {
    document.getElementById("popup_grayout").style.display = "block";
    document.getElementById("loader").style.display = "block";
}

function hideLoader() {
    document.getElementById("popup_grayout").style.display = "none";
    document.getElementById("loader").style.display = "none";
}

function showPopupMessage(message) {
    document.getElementById("popup_grayout").style.display = "block";
    document.getElementById("popup_message").style.display = "block";
    document.getElementById("popup_message_content").innerHTML = message;
}

function hidePopupMessage() {
    document.getElementById("popup_grayout").style.display = "none";
    document.getElementById("popup_message").style.display = "none";
    document.getElementById("popup_message_content").innerHTML = "";
    document.getElementById("qrcode_container").innerHTML = "";
}



function slideBtnClick(id) {
    let target = document.getElementById(id);
    target.addEventListener('click', () => slideToggle(target.parentElement.querySelector(".section_content")));
}



/************************* Initialization *************************/
document.addEventListener("DOMContentLoaded", function(){
    console.log(document.getElementById("header_relays"));
    if (document.getElementById("header_relays") != null) {
        slideBtnClick("header_relays");
    }
    if (document.getElementById("header_tips") != null) {
        slideBtnClick("header_tips");
    }

    document.getElementById("popup_message_ok").addEventListener('click', () => {
        hidePopupMessage();
    });

    document.getElementById("popup_qrcode_ok").addEventListener('click', () => {
        hidePopupQR();
    });
});



function initializeIndex() {
    slideBtnClick("header_event");
    slideBtnClick("header_nip26");

    // Initialize the NIP-26 "Create" elements
    let target = document.getElementById("nip26_create_kinds_checkboxes");

    // Load the supported event kinds and create checkboxes
    fetch("/event/kinds")
    .then(response => response.json())
    .then(result => {
        for (kind of result.kinds) {
            var checkbox = document.createElement('input');
            checkbox.type = "checkbox";
            checkbox.name = "nip26_create_kinds";
            checkbox.className = "nip26_create_kinds";
            checkbox.value = kind[0];
            checkbox.id = `nip26_create_kinds_${kind[0]}`;
            
            var label = document.createElement('label')
            label.htmlFor = `nip26_create_kinds_${kind[0]}`;
            label.appendChild(document.createTextNode(`${kind[0]}: ${kind[1]}`));
            
            target.appendChild(checkbox);
            target.appendChild(label);
            target.appendChild(document.createElement('br'));
        }
    })


    document.getElementById('nip26_create_valid_from').valueAsDate = new Date();

    // Default valid_until to one month
    var valid_until = new Date();
    valid_until.setMonth(valid_until.getMonth() + 1);
    document.getElementById('nip26_create_valid_until').valueAsDate = valid_until;
}