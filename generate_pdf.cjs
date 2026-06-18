const { mdToPdf } = require('md-to-pdf');

(async () => {
    try {
        const pdf = await mdToPdf({ path: 'vendor_workflow_report.md' }, { dest: 'vendor_workflow_report.pdf', launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] } });
        console.log('PDF generated successfully');
    } catch (err) {
        console.error('Error generating PDF:', err);
    }
})();
