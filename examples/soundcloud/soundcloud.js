/*
 * Copyright 2015-2016 Canonical Ltd.
 *
 * This file is part of unity-js-scopes.
 *
 * unity-js-scopes is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; version 3.
 *
 * unity-js-scopes is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var http = require('http')
var scopes = require('unity-js-scopes')

// TODO: LANG specific host
var query_scheme = "https://";
var query_host = "api.soundcloud.com";
var query_path_tracks = "/tracks.json?client_id={1}&q={2}";

function SoundCloudClient() {
}
SoundCloudClient.prototype = {
    // TODO use promises
    tracks: function(search_query, callback) {
        var options = {
            host: query_host,
            path: query_path_tracks.
                replace("{1}", "apigee").
                replace("{2}", encodeURIComponent(search_query))
        };
        request_callback = function(http_response) {
            var result_data = '';

            http_response.on('data', function(chunk) {
                result_data += chunk;
            });
            http_response.on('end', function() {
                var results;

                try {
                    results = JSON.parse(result_data);
                } catch (e) { }

                if (! results
                    || ! results.length) {
                    callback([]);
                    return;
                }

                var track_results = [];
                for (var i = 0;
                     i < results.length;
                     i++) {
                    track_results.push({
                        id: results[i].id,
                        art: results[i].artwork_url ? results[i].artwork_url : "",
                        streamable: results[i].streamable,
                        stream_url: results[i].stream_url,
                        duration: results[i].duration,
                        uri: results[i].uri,
                        description: results[i].description,
                        genre: results[i].genre,
                        artist: {
                            id: results[i].user.id,
                            username: results[i].user.username,
                            search_url: results[i].user.uri
                        }
                    });
                }
                callback(track_results);
            });
        }
        http.request(options, request_callback).end();
    }
};

var client = new SoundCloudClient()

function scope_result_from_search_result(
    category,
    result) {

    var categorised_result =
        new scopes.lib.CategorisedResult(category);

    categorised_result.set_uri(result.uri)
    categorised_result.set_title(result.description);
    categorised_result.set_art(result.art);

    categorised_result.set("artist", result.artist.username);
    categorised_result.set("stream", result.stream_url);
    categorised_result.set("duration", result.duration);
    categorised_result.set("audio-data", {
        "uri": result.stream_url,
        "duration": result.duration
    });

    return categorised_result
}

function on_search(canned_query, metadata) {
    var category_description = "{ \
      \"schema-version\": 1, \
      \"template\": { \
        \"category-layout\": \"grid\", \
        \"card-layout\": \"horizontal\", \
        \"card-size\": \"large\", \
        \"quick-preview-type\" : \"audio\" \
      }, \
      \"components\": { \
        \"title\": \"title\", \
        \"art\" : { \
          \"field\": \"art\", \
          \"conciergeMode\": true \
        }, \
        \"subtitle\": \"artist\", \
        \"quick-preview-data\": { \
          \"field\": \"audio-data\" \
        } \
      } \
    }";

    return new scopes.lib.SearchQuery(
        canned_query,
        metadata,
        // Query.run
        function(search_reply) {
            var category_renderer =
                new scopes.lib.CategoryRenderer(category_description);
            var category =
                search_reply.register_category(
                    "tracks",
                    "",
                    "",
                    category_renderer);

            var query_string =
                canned_query.query_string().trim();

            if (query_string &&
                query_string.length &&
                query_string.length != 0) {
                client.tracks(query_string, function(results) {
                    for (var i in results) {
                        var cr = scope_result_from_search_result(
                            category,
                            results[i]
                        );
                        search_reply.push(cr);
                    }
                    search_reply.finished();
                });
            }
            else {
                client.tracks("blur cover", function(results) {
                    for (var i in results) {
                        var cr = scope_result_from_search_result(
                            category,
                            results[i]
                        );
                        search_reply.push(cr);
                    }
                    search_reply.finished();
                });
            }
        },
        // cancelled
        function() {
            console.log('Result query cancelled')
        });
};

function on_preview(result, action_metadata) {
    return new scopes.lib.PreviewQuery(
        result,
        action_metadata,
        // run
        function(preview_reply) {
            var r = this.result();

            var layout1col = new scopes.lib.ColumnLayout(1)
            layout1col.add_column([
                "imageId",
                "headerId",
                "actionsId",
                "updatePreviewActionsId"])

            var layout2col = new scopes.lib.ColumnLayout(2)
            layout2col.add_column(["imageId"])
            layout2col.add_column(["headerId", "actionsId", "updatePreviewActionsId"])

            preview_reply.register_layout([layout1col, layout2col]);

            var header_widget = new scopes.lib.PreviewWidget("headerId", "header");
            header_widget.add_attribute_mapping("title", "title");
            header_widget.add_attribute_mapping("subtitle", "subtitle");

            var art_widget = new scopes.lib.PreviewWidget("imageId", "image");
            art_widget.add_attribute_mapping("source", "art");

            var update_preview_button_widget = 
                createUpdatePreviewActionsIdWidget("Update");

            var actions_widget = new scopes.lib.PreviewWidget("actionsId", "actions");
            actions_widget.add_attribute_value(
                "actions",
                [
                    {
                      "id": "open",
                      "label": "Open",
                      "uri": r.get("uri")
                    },
                    {
                      "id": "download",
                      "label": "Download"
                    },
                    {
                      "id": "test",
                      "label": "Test"
                    }
                ]
            );

            preview_reply.push([
                header_widget,
                art_widget,
                actions_widget,
                update_preview_button_widget
            ]);

            preview_reply.finished();
        },
        // cancelled
        function() {
            console.log('Result preview cancelled')
        });
};

scopes.self.initialize(
    {}
    ,
    {
        run: function() {
            console.log('Running...')
        },
        start: function(scope_id) {
            console.log('Starting scope id: '
                        + scope_id
                        + ', '
                        + scopes.self.scope_config)
        },
        search: on_search,
        preview: on_preview,
        perform_action: function(result, metadata, widget_id, action_id) {
            console.log('Action performed', widget_id, action_id)

            return new scopes.lib.ActivationQuery(
                result,
                metadata,
                widget_id,
                action_id,
                // activate
                function() {
                    console.log('Activate called');

                    var activation_response;
                    switch (action_id) {
                        case 'updateId':
                            activation_response = activateUpdatePreview();
                            break;
                        default:
                            activation_response = new scopes.lib.ActivationResponse(
                                scopes.defs.ActivationResponseStatus.NotHandled);
                            break;
                    }

                    return activation_response;
                },
                // cancelled
                function() {
                }
            );
        }
    }
);

/**
 * Updates the "updatePreviewActionsId" widget:
 * Sets the widget's label to "Updated !".
 */
function activateUpdatePreview(result) {
    var widgets = [];
    var update_preview_button_widget =
        createUpdatePreviewActionsIdWidget("Updated !");
    widgets.push(update_preview_button_widget);
    return new scopes.lib.ActivationResponse(widgets);
}

function createUpdatePreviewActionsIdWidget(label) {
    var update_preview_button_widget =
        new scopes.lib.PreviewWidget("updatePreviewActionsId", "actions");
    update_preview_button_widget.add_attribute_value(
        "actions",
        [
            {
                id: "updateId",
                label: label
            }
        ]
    );
    return update_preview_button_widget;
}

