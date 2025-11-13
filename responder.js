// ===============================
// responder.js (อัปเดตล่าสุด)
// ===============================

// ===== สร้างแผนที่ =====
const map = new longdo.Map({
  placeholder: document.getElementById('map')
});

// uid ของเจ้าหน้าที่ (สร้างแบบสุ่มเพื่อทดสอบ)
const responderID = "res_" + Math.random().toString(36).substring(2, 6);

// ===== เก็บข้อมูล =====
let sosMarkers = [];              // หมุด SOS
let responderMarkers = {};        // หมุดเจ้าหน้าที่ (ของตัวเอง)
let casesMap = {};                // เก็บข้อมูลเคสทั้งหมด
let assignedCaseId = null;        // เก็บ id เคสที่รับอยู่

// ===== ใช้ระบบ Route ของ Longdo =====
map.Route.placeholder(window.routePanel);

// ✅ เคลียร์เส้นทางเก่า
function clearRoute() {
  map.Route.clear();
  window.routePanel.innerHTML = 'ไม่มีเส้นทาง';
}

// ✅ วาดเส้นทาง built-in UI
function drawRouteWithUI(responderPos, caseObj) {
  clearRoute();
  map.Route.add({ lon: responderPos.lng, lat: responderPos.lat });
  map.Route.add({ lon: caseObj.lng, lat: caseObj.lat });
  map.Route.search();
}

// ===============================
// 🔴 แสดงหมุด SOS จาก Firebase
// ===============================
db.ref("cases").on("value", snapshot => {

  // ลบ marker เดิมก่อน
  sosMarkers.forEach(m => map.Overlays.remove(m));
  sosMarkers = [];
  casesMap = {};

  snapshot.forEach(child => {
    const id = child.key;
    const c = child.val();
    casesMap[id] = c;

    // ถ้าเคสปิดแล้ว ไม่ต้องแสดง
    if (c.status === "done") {
      if (assignedCaseId === id) {
        assignedCaseId = null;
        clearRoute();
      }
      return;
    }

    // สีหมุดตามสถานะ
    let iconColor = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
    if (c.status === "assigned") iconColor = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
    if (c.status === "done") iconColor = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";

    // สร้างหมุด SOS
    const marker = new longdo.Marker(
      { lon: c.lng, lat: c.lat },
      {
        title: "🚨 SOS",
        detail: `
          <b>ชื่อ:</b> ${c.name}<br>
          <b>เบอร์:</b> ${c.phone}<br>
          <b>เหตุการณ์:</b> ${c.incident}<br>
          <b>รายละเอียด:</b> ${c.detail}<br>
          <b>สถานะ:</b> ${c.status}<br>
          <button onclick="assignCase('${id}')">รับงาน</button><br>
          <button onclick="doneCase('${id}')">เสร็จงาน</button>
        `,
        icon: { html:`<img src="${iconColor}" width="32">` }
      }
    );

    map.Overlays.add(marker);
    sosMarkers.push(marker);

    // ถ้าเคสนี้เป็นของเรา → วาดเส้นทาง
    if (c.assignedTo === responderID) {
      assignedCaseId = id;
      const myPosRef = db.ref('responders/' + responderID);
      myPosRef.once('value').then(snap => {
        const me = snap.val();
        if (me) drawRouteWithUI(me, c);
      });
    }
  });
});

// ===============================
// ✅ ฟังก์ชันรับงาน / เสร็จงาน
// ===============================
function assignCase(id) {
  db.ref("cases/" + id).update({
    status: "assigned",
    assignedTo: responderID
  });
}

function doneCase(id) {
  db.ref("cases/" + id).update({
    status: "done"
  });

  if (assignedCaseId === id) {
    assignedCaseId = null;
    clearRoute();
  }
}

// ===============================
// 🔵 อัปเดตตำแหน่งตัวเองเท่านั้น
// ===============================
setInterval(() => {
  navigator.geolocation.getCurrentPosition(pos => {
    const myData = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      timestamp: Date.now()
    };

    // บันทึกลง Firebase
    db.ref("responders/" + responderID).set(myData);

    // ลบหมุดเดิมก่อน
    if (responderMarkers[responderID]) {
      try { map.Overlays.remove(responderMarkers[responderID]); } catch(e){}
    }

    // วาดหมุดของตัวเอง
    const myMarker = new longdo.Marker(
      { lon: myData.lng, lat: myData.lat },
      {
        title: "คุณ (เจ้าหน้าที่)",
        detail: "ตำแหน่งปัจจุบันของคุณ",
        icon: { html:`<img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" width="32">` }
      }
    );

    map.Overlays.add(myMarker);
    responderMarkers[responderID] = myMarker;

    // ถ้ามีเคสที่รับอยู่ → วาดเส้นทางสด
    if (assignedCaseId && casesMap[assignedCaseId]) {
      drawRouteWithUI(myData, casesMap[assignedCaseId]);
    }

  }, err => console.error('geo err', err));
}, 2000);
