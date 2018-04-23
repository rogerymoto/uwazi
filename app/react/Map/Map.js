import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ReactMapGL, { NavigationControl, Marker, Popup } from 'react-map-gl';

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viewport: {
        latitude: props.latitude,
        longitude: props.longitude,
        width: props.width || 250,
        height: props.height || 200,
        zoom: props.zoom,
      },
      selectedMarker: null
    };

    this._onViewportChange = (viewport) => {
      this.setState({ viewport });
    };

    this.setSize = this.setSize.bind(this);
  }

  componentDidMount() {
    this.setSize();
    this.eventListener = window.addEventListener('resize', this.setSize);
  }

  componentWillReceiveProps(props) {
    const { latitude, longitude, markers } = props;
    const viewport = Object.assign(this.state.viewport, { latitude, longitude, markers });
    this.setState({ viewport });
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.setSize);
  }

  setSize() {
    if (!this.container || this.props.width) {
      return;
    }
    this.container.childNodes[0].style.width = 0;
    let width = this.container.offsetWidth;
    width = width < 240 ? 240 : width;
    this.container.childNodes[0].style.width = width;
    const height = width * 0.6;
    const { viewport } = this.state;
    viewport.width = width;
    viewport.height = height;
    this.setState({ viewport });
  }

  clickOnMarker(marker) {
    this.setState({ selectedMarker: marker });
    this.props.clickOnMarker(marker);
  }

  renderMarker(marker, onClick) {
    if (this.props.renderMarker) {
      return this.props.renderMarker(marker, onClick);
    }
    return (
      <i
        style={{ position: 'relative', top: '-35px', right: '25px', color: '#d9534e' }}
        className="fa fa-map-marker fa-3x fa-fw map-marker"
        onClick={onClick}
      />
    );
  }

  renderPopup() {
    const { selectedMarker } = this.state;
    return selectedMarker && selectedMarker.info &&
      <Popup
        tipSize={6}
        anchor="bottom"
        longitude={selectedMarker.longitude}
        latitude={selectedMarker.latitude}
        onClose={() => this.setState({ selectedMarker: null })}
      >
        <div>
          {selectedMarker.info}
        </div>
      </Popup>;
  }

  renderMarkers() {
    const { markers } = this.props;
    return markers.map((marker, index) => {
      const onClick = this.clickOnMarker.bind(this, marker);
      return (
        <Marker {...marker} key={index} offsetLeft={0} offsetTop={0}>
          {this.renderMarker(marker, onClick)}
        </Marker>
      );
    });
  }

  /*OSM Styles
    https://openmaptiles.github.io/osm-bright-gl-style/style-cdn.json
    https://openmaptiles.github.io/positron-gl-style/style-cdn.json
    https://openmaptiles.github.io/dark-matter-gl-style/style-cdn.json
    https://openmaptiles.github.io/klokantech-basic-gl-style/style-cdn.json
  */
  render() {
    const viewport = Object.assign({}, this.state.viewport);
    return (
      <div className="map-container" ref={(container) => { this.container = container; }} style={{ width: '100%' }}>
        <ReactMapGL
          {...viewport}
          dragRotate
          mapStyle="https://openmaptiles.github.io/klokantech-basic-gl-style/style-cdn.json"
          onViewportChange={this._onViewportChange}
          onClick={this.props.onClick}
        >
          <div style={{ position: 'absolute', left: 5, top: 5 }}>
            <NavigationControl onViewportChange={this._onViewportChange}/>
          </div>
          {this.renderMarkers()}
          {this.renderPopup()}

          <i className="mapbox-help fa fa-question-circle">
            <span className="mapbox-tooltip">Hold shift to rotate the map</span>
          </i>
        </ReactMapGL>
      </div>
    );
  }
}

Map.defaultProps = {
  markers: [],
  latitude: 46.22093287671913,
  longitude: 6.139284045121682,
  zoom: 4,
  width: null,
  height: null,
  onClick: () => {},
  clickOnMarker: () => {},
  renderMarker: null
};

Map.propTypes = {
  markers: PropTypes.arrayOf(PropTypes.object),
  latitude: PropTypes.number,
  longitude: PropTypes.number,
  zoom: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  onClick: PropTypes.func,
  clickOnMarker: PropTypes.func,
  renderMarker: PropTypes.func
};

export default Map;