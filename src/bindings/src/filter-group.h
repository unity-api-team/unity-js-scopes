/*
 * Copyright 2016 Canonical Ltd.
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

#ifndef _UNITY_JS_FILTER_GROUP_H_
#define _UNITY_JS_FILTER_GROUP_H_

#include <unity/scopes/FilterGroup.h>

class FilterGroup
{
public:
    FilterGroup(std::string const& id, std::string const& label);

    std::string id() const;
    std::string label() const;

    unity::scopes::FilterGroup::SCPtr get_filter_group() const;

private:
    unity::scopes::FilterGroup::SCPtr filter_group_;
};

#endif // _UNITY_JS_FILTER_GROUP_H_


