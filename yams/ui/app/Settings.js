import { onMounted, ref } from "./vue.js";

let execOnce = false;
const scanStatus = ref('Unavailable')


const checkStatus = async () => {
  let isScanning = true
  try {
    let url = '/api/isScanning'
    isScanning = await (await fetch(url)).json()
    if (isScanning) {
      scanStatus.value = 'Scanning'
      setTimeout(checkStatus, 5000)
    } else {
      scanStatus.value = 'Scan'
    }
  } catch (error) {
    console.error(error)
  }

}

const triggerScan = async () => {
  let url = '/api/triggerScan'
  try {
    let res = await fetch(url)
    if (res.status === 503) {
      alert("Scan is already running")
    }
  } catch (error) {
    console.error(error)
    alert("Failed to trigger scan")
  }
  checkStatus()
}

const Settings = {
  setup() {
    onMounted(async () => {
      if (!execOnce) {
        execOnce = true
        checkStatus()
      }
    })
    return {
      scanStatus,
      triggerScan
    }
  },
  template: `
    <div id="modalSettings" class="modal fade" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">Settings</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="container-fluid">
              <!-- Scan Status Section -->
              <div class="row mb-4">
                <div class="col-12 text-center">
                  <h6 class="text-muted">Library Scan</h6>
                  <button class="btn btn-outline-primary mt-2" :disabled="scanStatus != 'Scan'" @click="triggerScan">
                    <span v-if="scanStatus === 'Scanning'"><i class="spinner-border spinner-border-sm"></i> Scanning...</span>
                    <span v-else>{{ scanStatus }}</span>
                  </button>
                  <p class="small mt-2 text-muted">Initiate a library scan to update the media list.</p>
                </div>
              </div>
              <hr>

              <!-- Other Settings Section (for future options) -->
              <div class="row mb-3">
                <div class="col-12">
                  <h6 class="text-muted">Other Settings</h6>
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="setting1">
                    <label class="form-check-label" for="setting1">Option 1</label>
                  </div>
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="setting2">
                    <label class="form-check-label" for="setting2">Option 2</label>
                  </div>
                  <!-- Add more options as needed -->
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
    `
}

export { Settings };
