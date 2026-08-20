const newjob_btn = document.getElementById('new-job');
const upload_boxes = document.getElementById('uploads');

newjob_btn.addEventListener('click', () => {
    upload_boxes.style.display = 'flex';
});