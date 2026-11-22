class SubtabsController extends Controller {
    load(data) {
        this.data = {
            tabs: data.subtabs
        };
    }
}

module.exports = SubtabsController;
