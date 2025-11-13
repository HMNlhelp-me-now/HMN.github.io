let userLocation = null;
let userMarker = null;
let targetResponder = null;
let caseID = null;

const map = new longdo.Map({
  placeholder: document.getElementById('map')
});

// ==== ส่ง SOS ====
function sendSOS() {
  if (!userLocation) {
    alert("หา location ไม่พบ");
    return;
  }

  // อ่านข้อมูลจากฟอร์ม
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const incident = document.getElementById("incident").value.trim();
  const detail = document.getElementById("detail").value.trim();
  const province = document.getElementById("province").value.trim();
  const district = document.getElementById("district").value.trim();
  const subdistrict = document.getElementById("subdistrict").value.trim();

  if (!name || !phone || !incident) {
    alert("⚠ กรุณากรอกข้อมูลให้ครบ (ชื่อ/เบอร์/เหตุการณ์)");
    return;
  }

  // Push ขึ้น firebase
  const newCase = db.ref("cases").push({
    lat: userLocation.lat,
    lng: userLocation.lng,

    name: name,
    phone: phone,
    incident: incident,
    detail: detail,

    province: province,
    district: district,
    subdistrict: subdistrict,

    status: "pending",
    assignedTo: null,
    timestamp: Date.now()
  });

  caseID = newCase.key;
  document.getElementById("etaText").innerHTML = "⏳ รอเจ้าหน้าที่รับงาน...";
  alert("ส่ง SOS แล้ว ✅");
}



// ==== ตำแหน่งผู้ใช้ ====
navigator.geolocation.watchPosition(pos => {
  userLocation = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude
  };

  if (!userMarker) {
    userMarker = new longdo.Marker(
      { lon: userLocation.lng, lat: userLocation.lat },
      {
        title: "คุณ",
        icon: {
          html:`<img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" width="32">`
        }
      }
    );
    map.Overlays.add(userMarker);
    map.location({ lon: userLocation.lng, lat: userLocation.lat }, true);
  } else {
    userMarker.location({ lon: userLocation.lng, lat: userLocation.lat });
  }
});


// ==== ฟังเคสของเรา ====
db.ref("cases").on("value", snap => {

  snap.forEach(child => {
    const c = child.val();

    if (!userLocation) return;

    // หาเคสของเราจาก lat lng
    if (c.lat === userLocation.lat && c.lng === userLocation.lng) {

      caseID = child.key;

      // ยังไม่มีใครรับ
      if (c.status === "pending") {
        document.getElementById("etaText").innerHTML = "⏳ รอเจ้าหน้าที่รับงาน...";
      }

      // มีเจ้าหน้าที่รับแล้ว
      if (c.assignedTo) {
        listenResponder(c.assignedTo);
      }

      // เสร็จงานแล้ว
      if (c.status === "done") {
        document.getElementById("etaText").innerHTML =
          "✅ เจ้าหน้าที่ทำงานเสร็จแล้ว";
      }
    }
  });

});


// ==== ฟัง responder ที่รับงานของเรา ====
function listenResponder(responderID){

  db.ref("responders/" + responderID).on("value", snap => {
    const r = snap.val();
    if (!r || !userLocation) return;

    db.ref("cases/" + caseID).once("value").then(cs => {
      if (cs.val().status === "done") return; // ✅ ไม่ต้องคำนวณแล้ว

      const d = distance(userLocation.lat, userLocation.lng, r.lat, r.lng);
      const speed = 40; // km/h
      const eta = (d / speed) * 60;

      document.getElementById("etaText").innerHTML =
        `🚑 เจ้าหน้าที่กำลังมาหาคุณ<br>
         ระยะทาง: ${d.toFixed(2)} km<br>
         โดยประมาณ: ${eta.toFixed(1)} นาที`;
    });

  });

}


// ==== คำนวนระยะทาง ====
function distance(lat1, lon1, lat2, lon2){
  var R = 6371;
  var dLat = (lat2-lat1) * Math.PI/180;
  var dLon = (lon2-lon1) * Math.PI/180;
  var a =
    0.5 - Math.cos(dLat)/2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    (1-Math.cos(dLon))/2;

  return R * 2 * Math.asin(Math.sqrt(a));
}