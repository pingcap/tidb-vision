## TiDB Vision

`tidb-vision` is a component that provides the visualization of PD scheduling through a standalone UI framework. It uses d3 (data-driven-document) as the bottom layer render library, and uses the extended circos as the basic layout engine to implement layouts such as stacks, circle sector, and chords. The transition effect between states is provided through d3 transition.

### To do

- [ ] doc for `REGION_BYTE_SIZE` setting
- [ ] doc for new candy webserver docker image

### Dev

#### Prerequisite

- Depends on the latest version of the PD server. For details, see [the related PR](https://github.com/pingcap/pd/pull/881).

#### Install the dependencies

- node v7+, npm
- npm install

> **Note:** If you need external access, modify the host configuration of devServer in `webpack.config.js`.

#### Start the component

- Use the default mock server: `export PD_ENDPOINT=localhost:9000;npm start`
- Use the external PD server: `export PD_ENDPOINT=<PD_SERVER_IP>:<PORT>;npm start`

On the dashboard interface, click the entry to view the TiKV data distribution (Regions, leader), TiKV store, Region heat (I/O read and write rates) and PD scheduling history (Region/leader transfer) of the current cluster.

![](./demo.gif)

Description of the ring chart:

- The peripheral text provides the store's leader/Region change within each time window, such as `+10 Regions, - 3 Leaders`.
- The peripheral histogram groups: the left (the ring direction) histogram in each group shows the flowtypes information of store Write and hot Region Write operations; the right histogram shows the flowtypes information of store Read and hot Region Read operations.
- The length of the ring represents the entire storage space of a specific store, and the text shows the basic information, such as the store's host ip:port and id.
- The block stacks inside the ring show three types of information in terms of "disk storage": unused space blocks (light gray), ordinary Region blocks (dark gray), and blocks as leader (green).
- The chord arcs inside the ring show the Region and leader transfer information between stores.

> **Note:** Depending on the current cluster status, which includes the number of TiKV instances and TiKV storage usage and so on, the component condition such as the Write and Read "heat" might be different.