


const NowPlaying = {
    components: {

    },
    setup: () => {

        return {

        }
    },
    template: `
<div class="container py-4">
    <div class="row">
        <div class="col-md-4">
            <div class="now-playing-artwork-container">
                <img src="/play.png" alt="Artwork" class="img-fluid rounded">
            </div>
        </div>

        <div class="col-md-8">
            <div class="details">
                <h2 class="fw-bold">Song Title</h2>
                <p class="text-muted">Artist Name</p>

                <div class="row mb-3">
                    <div class="col-4 fw-bold">Album:</div>
                    <div class="col-8">Album Name</div>
                </div>

                <div class="row mb-3">
                    <div class="col-4 fw-bold">Genre:</div>
                    <div class="col-8">Genre Name</div>
                </div>

                <div class="row mb-3">
                    <div class="col-4 fw-bold">Year:</div>
                    <div class="col-8">2023</div>
                </div>

                <div class="row mb-3">
                    <div class="col-4 fw-bold">Track Number:</div>
                    <div class="col-8">Track 5</div>
                </div>

                <div class="row mb-3">
                    <div class="col-4 fw-bold">Duration:</div>
                    <div class="col-8">3:45</div>
                </div>
            </div>
        </div>
    </div>
</div>
    `
}
export { NowPlaying };
