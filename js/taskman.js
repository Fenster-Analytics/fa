FA.TaskMan = class extends FA.Element {
    constructor() {
        super('fa_taskman');
    }

    /// taskOptions: see rest.js
    static registerPromise(requestPromise, taskOptions) {
        if (!requestPromise) {
            return;
        }

        FA.TaskMan.taskList.push(taskOptions);

        FA.TaskMan.status.activeCount++;

        if (taskOptions.block) {
            FA.TaskMan.status.blockingCount++;
            FA.TaskMan.showBlockingLayer();
        }

        requestPromise.then(() => {
            FA.TaskMan.completeTask(taskOptions);
        }).catch(() => {
            FA.TaskMan.status.errorCount++;
            FA.TaskMan.completeTask(taskOptions);
        });

        FA.TaskMan.refreshWidgets();
    }

    static recordCacheHit(taskOptions) {
        if (!taskOptions.cachedCount) taskOptions.cachedCount = 0;
        taskOptions.cachedCount++;
        FA.TaskMan.taskList.push(taskOptions);

        FA.TaskMan.status.cachedCount++;
        FA.TaskMan.refreshWidgets();
    }

    static completeTask(taskOptions) {
        FA.TaskMan.status.activeCount--;
        FA.TaskMan.status.completeCount++;

        if (taskOptions.block) {
            FA.TaskMan.status.blockingCount--;
            if (FA.TaskMan.status.blockingCount <= 0 && FA.TaskMan.blockingLayer) {
                FA.TaskMan.hideBlockingLayer();
                assert(FA.TaskMan.status.blockingCount === 0);
            }
        }

        FA.TaskMan.refreshWidgets();
    }

    static showBlockingLayer() {
        if (!FA.TaskMan.blockingLayer) {
            FA.TaskMan.blockingLayer = document.createElement('fa-blocking-layer');
            FA.TaskMan.blockingLayer.innerHTML = FA.savingHTML;
            document.querySelector('body').append(FA.TaskMan.blockingLayer);
        }
        FA.TaskMan.blockingLayer.classList.add('active');
    }

    static hideBlockingLayer() {
        FA.TaskMan.blockingLayer.classList.remove('active');
        // Optional: always recreate the layer
        //FA.TaskMan.blockingLayer.remove();
        //FA.TaskMan.blockingLayer = undefined;
    }

    static refreshWidgets() {
        document.querySelectorAll('fa-taskman').forEach(function(tm) {
            //console.log('UPDATE TASKMAN WIDGET', FA.TaskMan.activeCount);
            tm.data = FA.TaskMan.status;
        });
    }

    showModal() {
        this.el.taskList.innerHTML = Template.render('fa_taskman_detail', FA.TaskMan.taskList);
        this.el.layer.classList.add('active');
    }

    hideModal() {
        this.el.layer.classList.remove('active');
    }
};
FA.TaskMan.taskList = [];
FA.TaskMan.status = {
    activeCount: 0,
    completeCount: 0,
    cachedCount: 0,
    blockingCount: 0,
    errorCount: 0,
}
window.customElements.define('fa-taskman', FA.TaskMan);
